// Payment functionality with Stripe integration
let stripe;
let elements;
let cardElement;
let appointmentData;
let clientSecret;

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    // Get appointment data from sessionStorage
    const storedData = sessionStorage.getItem('appointmentData');

    if (!storedData) {
        showAlert('No appointment data found. Please book an appointment first.', 'error');
        setTimeout(() => {
            window.location.href = '/book-appointment';
        }, 2000);
        return;
    }

    appointmentData = JSON.parse(storedData);

    // Display appointment summary
    displayAppointmentSummary();

    // Get Stripe publishable key
    await initializeStripe();

    // Setup payment method change handler
    document.getElementById('paymentMethod').addEventListener('change', handlePaymentMethodChange);
});

function displayAppointmentSummary() {
    document.getElementById('summaryPatientName').textContent = appointmentData.patientName;
    document.getElementById('summaryDoctor').textContent = appointmentData.doctorName;
    document.getElementById('summaryDepartment').textContent = appointmentData.department;
    document.getElementById('summaryDateTime').textContent =
        `${appointmentData.appointmentDate} at ${appointmentData.appointmentTime}`;
    document.getElementById('summaryFee').textContent = `$${appointmentData.consultationFee}`;
    document.getElementById('totalAmount').textContent = `$${appointmentData.consultationFee}`;
}

async function initializeStripe() {
    try {
        const response = await fetch('/api/config/stripe-key');
        const config = await response.json();

        // Initialize Stripe with publishable key
        stripe = Stripe(config.publishableKey);

        // Create card element
        elements = stripe.elements();
        cardElement = elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#2c3e50',
                    '::placeholder': {
                        color: '#6c757d',
                    },
                },
            },
        });

        cardElement.mount('#card-element');

        // Handle real-time validation errors
        cardElement.on('change', function(event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });

    } catch (error) {
        console.error('Error initializing Stripe:', error);
        showAlert('Failed to initialize payment system. Please refresh the page.', 'error');
    }
}

function handlePaymentMethodChange() {
    const paymentMethod = document.getElementById('paymentMethod').value;
    const cardSection = document.getElementById('cardPaymentSection');
    const altPaymentInfo = document.getElementById('alternativePaymentInfo');

    if (paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') {
        cardSection.style.display = 'block';
        altPaymentInfo.style.display = 'none';
    } else {
        cardSection.style.display = 'none';
        altPaymentInfo.style.display = 'block';
    }
}

// Payment button click handler
document.getElementById('paymentBtn').addEventListener('click', async function() {
    const paymentMethod = document.getElementById('paymentMethod').value;

    if (paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') {
        await processStripePayment();
    } else {
        await processAlternativePayment(paymentMethod);
    }
});

async function processStripePayment() {
    const paymentBtn = document.getElementById('paymentBtn');
    const originalText = paymentBtn.innerHTML;

    paymentBtn.disabled = true;
    paymentBtn.innerHTML = '<span class="loading"></span> Processing Payment...';

    try {
        // Step 1: Create payment intent
        const intentResponse = await fetch('/api/payments/create-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `appointmentId=${appointmentData.appointmentId}&paymentMethod=${document.getElementById('paymentMethod').value}`
        });

        const intentData = await intentResponse.json();

        if (!intentResponse.ok || !intentData.success) {
            throw new Error(intentData.error || 'Failed to create payment intent');
        }

        clientSecret = intentData.clientSecret;

        // Step 2: Confirm card payment with Stripe
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: appointmentData.patientName,
                    email: appointmentData.email,
                }
            }
        });

        if (error) {
            showAlert(error.message, 'error');
            paymentBtn.disabled = false;
            paymentBtn.innerHTML = originalText;
            return;
        }

        // Step 3: Confirm payment in backend
        if (paymentIntent.status === 'succeeded') {
            const confirmResponse = await fetch('/api/payments/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `paymentIntentId=${paymentIntent.id}`
            });

            const confirmData = await confirmResponse.json();

            if (confirmResponse.ok && confirmData.success) {
                // Clear session storage
                sessionStorage.removeItem('appointmentData');

                // Redirect to success page with details
                const params = new URLSearchParams({
                    id: appointmentData.appointmentId,
                    patient: appointmentData.patientName,
                    doctor: appointmentData.doctorName,
                    dept: appointmentData.department,
                    datetime: `${appointmentData.appointmentDate} ${appointmentData.appointmentTime}`,
                    amount: appointmentData.consultationFee
                });

                window.location.href = `/success?${params.toString()}`;
            } else {
                throw new Error(confirmData.error || 'Failed to confirm payment');
            }
        }

    } catch (error) {
        console.error('Payment error:', error);
        showAlert(error.message || 'Payment failed. Please try again.', 'error');
        paymentBtn.disabled = false;
        paymentBtn.innerHTML = originalText;
    }
}

async function processAlternativePayment(paymentMethod) {
    // For demo purposes, we'll simulate alternative payment
    showAlert('Alternative payment methods will redirect to the respective payment gateways. For this demo, please use Credit/Debit Card.', 'info');

    // In production, you would integrate with:
    // - Razorpay for UPI, Net Banking, Wallets (India)
    // - PayPal for international payments
    // - Other regional payment gateways
}

function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    const alertClass = type === 'error' ? 'alert-error' : type === 'success' ? 'alert-success' : 'alert-info';

    alertContainer.innerHTML = `
        <div class="alert ${alertClass}">
            ${message}
        </div>
    `;

    // Scroll to alert
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
//Full stack medical website with payment integration - Claude
