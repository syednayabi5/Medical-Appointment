// Booking functionality
const doctors = {
    'Cardiology': [
        { name: 'Dr. Sarah Johnson', specialty: 'Cardiologist', fee: 150 },
        { name: 'Dr. Michael Chen', specialty: 'Cardiac Surgeon', fee: 200 }
    ],
    'Neurology': [
        { name: 'Dr. Emily Davis', specialty: 'Neurologist', fee: 175 },
        { name: 'Dr. Robert Miller', specialty: 'Neurosurgeon', fee: 225 }
    ],
    'Orthopedics': [
        { name: 'Dr. James Wilson', specialty: 'Orthopedic Surgeon', fee: 160 },
        { name: 'Dr. Lisa Anderson', specialty: 'Sports Medicine', fee: 140 }
    ],
    'Pediatrics': [
        { name: 'Dr. Maria Garcia', specialty: 'Pediatrician', fee: 120 },
        { name: 'Dr. David Brown', specialty: 'Pediatric Specialist', fee: 130 }
    ],
    'Dermatology': [
        { name: 'Dr. Jennifer Lee', specialty: 'Dermatologist', fee: 135 },
        { name: 'Dr. Thomas White', specialty: 'Cosmetic Dermatology', fee: 180 }
    ],
    'Ophthalmology': [
        { name: 'Dr. Patricia Martinez', specialty: 'Ophthalmologist', fee: 145 },
        { name: 'Dr. Christopher Taylor', specialty: 'Eye Surgeon', fee: 195 }
    ],
    'Dentistry': [
        { name: 'Dr. Amanda Clark', specialty: 'General Dentist', fee: 100 },
        { name: 'Dr. Kevin Rodriguez', specialty: 'Orthodontist', fee: 150 }
    ],
    'General Medicine': [
        { name: 'Dr. Nancy King', specialty: 'General Physician', fee: 80 },
        { name: 'Dr. Steven Wright', specialty: 'Family Medicine', fee: 90 }
    ]
};

let selectedDoctor = null;

// Set minimum date to today
document.getElementById('appointmentDate').min = new Date().toISOString().split('T')[0];

// Department change event
document.getElementById('department').addEventListener('change', function() {
    const department = this.value;
    const doctorsContainer = document.getElementById('doctorsContainer');

    if (!department) {
        doctorsContainer.innerHTML = '';
        return;
    }

    const departmentDoctors = doctors[department] || [];
    doctorsContainer.innerHTML = '';

    departmentDoctors.forEach(doctor => {
        const doctorCard = document.createElement('div');
        doctorCard.className = 'doctor-card';
        doctorCard.innerHTML = `
            <div class="doctor-info">
                <div class="doctor-name">${doctor.name}</div>
                <div class="doctor-specialty">${doctor.specialty}</div>
                <div class="doctor-fee">$${doctor.fee}</div>
            </div>
        `;

        doctorCard.addEventListener('click', function() {
            // Remove previous selection
            document.querySelectorAll('.doctor-card').forEach(card => {
                card.classList.remove('selected');
            });

            // Add selection to clicked card
            this.classList.add('selected');
            selectedDoctor = doctor;

            // Update hidden fields
            document.getElementById('doctorName').value = doctor.name;
            document.getElementById('consultationFee').value = doctor.fee;
        });

        doctorsContainer.appendChild(doctorCard);
    });
});

// Form submission
document.getElementById('appointmentForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Validate doctor selection
    if (!selectedDoctor) {
        showAlert('Please select a doctor', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Processing...';

    // Gather form data
    const formData = {
        patientName: document.getElementById('patientName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        medicalHistory: document.getElementById('medicalHistory').value,
        doctorName: selectedDoctor.name,
        department: document.getElementById('department').value,
        appointmentDate: document.getElementById('appointmentDate').value,
        appointmentTime: document.getElementById('appointmentTime').value,
        consultationFee: selectedDoctor.fee,
        symptoms: document.getElementById('symptoms').value
    };

    try {
        const response = await fetch('/api/appointments/book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Store appointment data in sessionStorage
            sessionStorage.setItem('appointmentData', JSON.stringify({
                appointmentId: data.appointmentId,
                ...formData
            }));

            // Redirect to payment page
            window.location.href = '/payment';
        } else {
            showAlert(data.error || 'Failed to book appointment', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('An error occurred. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
});

function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    const alertClass = type === 'error' ? 'alert-error' : type === 'success' ? 'alert-success' : 'alert-info';

    alertContainer.innerHTML = `
        <div class="alert ${alertClass}">
            ${message}
        </div>
    `;

    // Scroll to alert
    alertContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Auto-hide after 5 seconds
    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 5000);
}
//Full stack medical website with payment integration - Claude
