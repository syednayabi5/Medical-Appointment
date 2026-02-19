package com.medical.service;


import com.medical.model.Appointment;
import com.medical.model.Payment;
import com.medical.repository.PaymentRepository;

// PayPal imports
import com.paypal.api.payments.*;
import com.paypal.base.rest.APIContext;
import com.paypal.base.rest.PayPalRESTException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {
    private final PaymentRepository paymentRepository;

    @Value("${paypal.client.id}")
    private String paypalClientId;

    @Value("${paypal.client.secret}")
    private String paypalClientSecret;

    @Value("${paypal.mode}")        // "sandbox" or "live"
    private String paypalMode;

    @Value("${app.base.url}")       // e.g. http://localhost:8080
    private String appBaseUrl;

    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    // ── Build PayPal API context ───────────────────────────────────────────────
    private APIContext getPayPalContext() {
        return new APIContext(paypalClientId, paypalClientSecret, paypalMode);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  CREATE ORDER  –  called when user clicks "Pay with PayPal"
    // ═══════════════════════════════════════════════════════════════════════════
    public Map<String, String> createPayPalOrder(Appointment appointment)
            throws PayPalRESTException {

        Amount amount = new Amount();
        amount.setCurrency("USD");
        amount.setTotal(String.format("%.2f", appointment.getConsultationFee()));

        Transaction transaction = new Transaction();
        transaction.setDescription(
                "Medical Consultation – Dr. " + appointment.getDoctorName()
                        + " | Patient: " + appointment.getPatient().getName());
        transaction.setAmount(amount);

        List<Transaction> transactions = new ArrayList<>();
        transactions.add(transaction);

        Payer payer = new Payer();
        payer.setPaymentMethod("paypal");

        RedirectUrls redirectUrls = new RedirectUrls();
        redirectUrls.setReturnUrl(
                appBaseUrl + "/api/paypal/capture?appointmentId=" + appointment.getId());
        redirectUrls.setCancelUrl(
                appBaseUrl + "/payment?cancelled=true&appointmentId=" + appointment.getId());

        com.paypal.api.payments.Payment paypalPayment =
                new com.paypal.api.payments.Payment();
        paypalPayment.setIntent("sale");
        paypalPayment.setPayer(payer);
        paypalPayment.setTransactions(transactions);
        paypalPayment.setRedirectUrls(redirectUrls);

        com.paypal.api.payments.Payment created =
                paypalPayment.create(getPayPalContext());

        // Save PENDING record
        Payment dbPayment = new Payment();
        dbPayment.setAppointment(appointment);
        dbPayment.setAmount(appointment.getConsultationFee());
        dbPayment.setPaymentMethod(Payment.PaymentMethod.PAYPAL);
        dbPayment.setPaypalOrderId(created.getId());
        dbPayment.setTransactionId(UUID.randomUUID().toString());
        dbPayment.setStatus(Payment.PaymentStatus.PENDING);
        paymentRepository.save(dbPayment);

        String approvalUrl = created.getLinks().stream()
                .filter(link -> "approval_url".equals(link.getRel()))
                .findFirst()
                .map(Links::getHref)
                .orElseThrow(() -> new PayPalRESTException("No approval URL from PayPal"));

        Map<String, String> response = new HashMap<>();
        response.put("approvalUrl",   approvalUrl);
        response.put("paypalOrderId", created.getId());
        return response;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  CAPTURE PAYMENT  –  called after user approves on PayPal
    // ===========================================================================
    @Transactional
    public Payment capturePayPalPayment(String paypalOrderId, String payerId)
            throws Exception {

        Payment dbPayment = paymentRepository.findByPaypalOrderId(paypalOrderId)
                .orElseThrow(() -> new Exception(
                        "No payment record found for PayPal order: " + paypalOrderId));

        try {
            com.paypal.api.payments.Payment paypalPayment =
                    com.paypal.api.payments.Payment.get(getPayPalContext(), paypalOrderId);

            PaymentExecution execution = new PaymentExecution();
            execution.setPayerId(payerId);

            com.paypal.api.payments.Payment executed =
                    paypalPayment.execute(getPayPalContext(), execution);

            if ("approved".equals(executed.getState())) {
                String captureId = executed.getTransactions()
                        .get(0).getRelatedResources().get(0).getSale().getId();

                dbPayment.setPaypalCaptureId(captureId);
                dbPayment.setStatus(Payment.PaymentStatus.COMPLETED);
                dbPayment.setPaidAt(LocalDateTime.now());
                dbPayment.getAppointment().setStatus(Appointment.AppointmentStatus.CONFIRMED);
            } else {
                dbPayment.setStatus(Payment.PaymentStatus.FAILED);
            }

        } catch (PayPalRESTException e) {
            dbPayment.setStatus(Payment.PaymentStatus.FAILED);
            paymentRepository.save(dbPayment);
            throw new Exception("PayPal capture failed: " + e.getMessage());
        }

        return paymentRepository.save(dbPayment);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  REFUND  –  reverses a completed PayPal payment
    // ===========================================================================
    @Transactional
    public Payment processRefund(Long appointmentId) throws Exception {
        Payment payment = paymentRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new Exception("Payment not found for appointment " + appointmentId));

        if (payment.getStatus() != Payment.PaymentStatus.COMPLETED) {
            throw new Exception("Cannot refund: payment is not COMPLETED");
        }

        try {
            Sale sale = Sale.get(getPayPalContext(), payment.getPaypalCaptureId());
            DetailedRefund refund = sale.refund(getPayPalContext(), new RefundRequest());

            if ("completed".equals(refund.getState())) {
                payment.setStatus(Payment.PaymentStatus.REFUNDED);
                return paymentRepository.save(payment);
            }
            throw new Exception("PayPal refund did not complete");
        } catch (PayPalRESTException e) {
            throw new Exception("PayPal refund error: " + e.getMessage());
        }
    }
    //  UTILITY

    public Payment getPaymentByAppointmentId(Long appointmentId) throws Exception {
        return paymentRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new Exception(
                        "Payment not found for appointment " + appointmentId));
    }

}
