// Appointments list functionality
document.addEventListener('DOMContentLoaded', async function() {
    await loadAppointments();
});

async function loadAppointments() {
    const container = document.getElementById('appointmentsContainer');

    try {
        const response = await fetch('/api/appointments');
        const appointments = await response.json();

        if (!response.ok) {
            throw new Error('Failed to load appointments');
        }

        if (appointments.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📅</div>
                    <h3 style="color: var(--text-light); margin-bottom: 1rem;">No Appointments Found</h3>
                    <p style="color: var(--text-light); margin-bottom: 2rem;">
                        You haven't booked any appointments yet.
                    </p>
                    <a href="/book-appointment" class="btn btn-primary">Book Your First Appointment</a>
                </div>
            `;
            return;
        }

        // Display appointments
        container.innerHTML = appointments.map(appointment => createAppointmentCard(appointment)).join('');

        // Add event listeners for cancel buttons
        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => cancelAppointment(btn.dataset.id));
        });

    } catch (error) {
        console.error('Error loading appointments:', error);
        container.innerHTML = `
            <div class="alert alert-error">
                Failed to load appointments. Please try again later.
            </div>
        `;
    }
}

function createAppointmentCard(appointment) {
    const date = new Date(appointment.appointmentDateTime);
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const statusColors = {
        PENDING: 'var(--warning-color)',
        CONFIRMED: 'var(--success-color)',
        COMPLETED: 'var(--primary-color)',
        CANCELLED: 'var(--danger-color)'
    };

    const statusColor = statusColors[appointment.status] || 'var(--text-light)';

    return `
        <div class="form-container" style="margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem;">
                <div>
                    <h3 style="color: var(--primary-color); font-family: 'Crimson Pro', serif; margin-bottom: 0.5rem;">
                        Appointment #${appointment.id}
                    </h3>
                    <div style="display: inline-block; padding: 0.3rem 0.8rem; background: ${statusColor}; color: white; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">
                        ${appointment.status}
                    </div>
                </div>
                ${appointment.status === 'PENDING' || appointment.status === 'CONFIRMED' ? `
                    <button class="btn btn-secondary cancel-btn" data-id="${appointment.id}"
                            style="background: var(--danger-color); padding: 0.6rem 1.5rem;">
                        Cancel
                    </button>
                ` : ''}
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
                <div>
                    <div style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 0.3rem;">Patient</div>
                    <div style="font-weight: 600;">${appointment.patient.name}</div>
                </div>
                <div>
                    <div style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 0.3rem;">Doctor</div>
                    <div style="font-weight: 600;">${appointment.doctorName}</div>
                </div>
                <div>
                    <div style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 0.3rem;">Department</div>
                    <div style="font-weight: 600;">${appointment.department}</div>
                </div>
                <div>
                    <div style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 0.3rem;">Date</div>
                    <div style="font-weight: 600;">${formattedDate}</div>
                </div>
                <div>
                    <div style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 0.3rem;">Time</div>
                    <div style="font-weight: 600;">${formattedTime}</div>
                </div>
                <div>
                    <div style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 0.3rem;">Consultation Fee</div>
                    <div style="font-weight: 600; color: var(--success-color);">$${appointment.consultationFee}</div>
                </div>
            </div>

            ${appointment.symptoms ? `
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
                    <div style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 0.5rem;">Symptoms / Reason</div>
                    <div>${appointment.symptoms}</div>
                </div>
            ` : ''}

            ${appointment.notes ? `
                <div style="margin-top: 1rem;">
                    <div style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 0.5rem;">Doctor's Notes</div>
                    <div style="background: var(--light-bg); padding: 1rem; border-radius: 8px;">${appointment.notes}</div>
                </div>
            ` : ''}
        </div>
    `;
}

async function cancelAppointment(appointmentId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
        return;
    }

    try {
        const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
            method: 'POST'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showAlert('Appointment cancelled successfully', 'success');
            await loadAppointments(); // Reload appointments
        } else {
            throw new Error(data.error || 'Failed to cancel appointment');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message || 'Failed to cancel appointment', 'error');
    }
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

    // Auto-hide after 5 seconds
    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 5000);
}
//Full stack medical website with payment integration - Claude
