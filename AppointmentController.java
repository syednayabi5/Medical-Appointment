package com.medical.controller;

import com.medical.dto.AppointmentBookingDTO;
import com.medical.model.Appointment;
import com.medical.model.Payment;
import com.medical.service.AppointmentService;
import com.medical.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/api")
public class AppointmentController {
    private final AppointmentService appointmentService;
    private final PaymentService paymentService;

    public AppointmentController(AppointmentService appointmentService,
                                 PaymentService paymentService) {
        this.appointmentService = appointmentService;
        this.paymentService = paymentService;
    }

    /**
     * Book a new appointment (API endpoint)
     */
    @PostMapping("/appointments/book")
    @ResponseBody
    public ResponseEntity<?> bookAppointment(@Valid @RequestBody AppointmentBookingDTO bookingDTO,
                                             BindingResult result) {
        if (result.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            result.getFieldErrors().forEach(error ->
                    errors.put(error.getField(), error.getDefaultMessage())
            );
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            Appointment appointment = appointmentService.bookAppointment(bookingDTO);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Appointment booked successfully");
            response.put("appointmentId", appointment.getId());
            response.put("amount", appointment.getConsultationFee());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  APPOINTMENT ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────────

    /** Get single appointment */
    @GetMapping("/appointments/{id}")
    @ResponseBody
    public ResponseEntity<?> getAppointment(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(appointmentService.getAppointmentById(id));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    /** List all appointments */
    @GetMapping("/appointments")
    @ResponseBody
    public ResponseEntity<List<Appointment>> getAllAppointments() {
        return ResponseEntity.ok(appointmentService.getAllAppointments());
    }

    /** Cancel an appointment */
    @PostMapping("/appointments/{id}/cancel")
    @ResponseBody
    public ResponseEntity<?> cancelAppointment(@PathVariable Long id) {
        try {
            Appointment appointment = appointmentService.cancelAppointment(id);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Appointment cancelled successfully");
            response.put("status",  appointment.getStatus());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  PAYPAL ENDPOINTS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create a PayPal order and return the approval URL.
     * Frontend redirects the user to that URL to approve payment.
     */
    @PostMapping("/paypal/create-order")
    @ResponseBody
    public ResponseEntity<?> createPayPalOrder(@RequestParam Long appointmentId) {
        try {
            Appointment appointment = appointmentService.getAppointmentById(appointmentId);
            Map<String, String> result = paymentService.createPayPalOrder(appointment);

            Map<String, Object> response = new HashMap<>();
            response.put("success",      true);
            response.put("approvalUrl",  result.get("approvalUrl"));
            response.put("paypalOrderId",result.get("paypalOrderId"));
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * PayPal redirects back here after the user approves the payment.
     * Captures the payment and redirects to the success page.
     */
    @GetMapping("/paypal/capture")
    public String capturePayPalPayment(
            @RequestParam("PayerID")      String payerId,
            @RequestParam("paymentId")    String paypalOrderId,
            @RequestParam("appointmentId") Long  appointmentId,
            org.springframework.web.servlet.mvc.support.RedirectAttributes ra) {
        try {
            Payment payment = paymentService.capturePayPalPayment(paypalOrderId, payerId);
            Appointment appt = payment.getAppointment();

            return "redirect:/success"
                    + "?id="       + appt.getId()
                    + "&patient="  + java.net.URLEncoder.encode(appt.getPatient().getName(), "UTF-8")
                    + "&doctor="   + java.net.URLEncoder.encode(appt.getDoctorName(), "UTF-8")
                    + "&dept="     + java.net.URLEncoder.encode(appt.getDepartment(), "UTF-8")
                    + "&datetime=" + java.net.URLEncoder.encode(
                    appt.getAppointmentDateTime().toString(), "UTF-8")
                    + "&amount="   + appt.getConsultationFee()
                    + "&via=paypal";

        } catch (Exception e) {
            return "redirect:/payment?error=" +
                    java.net.URLEncoder.encode(e.getMessage(), java.nio.charset.StandardCharsets.UTF_8);
        }
    }
}
