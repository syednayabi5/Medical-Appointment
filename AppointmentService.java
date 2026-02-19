package com.medical.service;

import com.medical.dto.AppointmentBookingDTO;
import com.medical.model.Appointment;
import com.medical.model.Patient;
import com.medical.repository.AppointmentRepository;
import com.medical.repository.PatientRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class AppointmentService {
    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;

    public AppointmentService(AppointmentRepository appointmentRepository,
                              PatientRepository patientRepository) {
        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
    }

    /**
     * Book a new appointment
     */
    @Transactional
    public Appointment bookAppointment(AppointmentBookingDTO bookingDTO) throws Exception {
        // Find or create patient
        Patient patient = patientRepository.findByEmail(bookingDTO.getEmail())
                .orElseGet(() -> {
                    Patient newPatient = new Patient();
                    newPatient.setName(bookingDTO.getPatientName());
                    newPatient.setEmail(bookingDTO.getEmail());
                    newPatient.setPhone(bookingDTO.getPhone());
                    newPatient.setAddress(bookingDTO.getAddress());
                    newPatient.setMedicalHistory(bookingDTO.getMedicalHistory());
                    return patientRepository.save(newPatient);
                });

        // Parse appointment date and time
        String dateTimeString = bookingDTO.getAppointmentDate() + " " + bookingDTO.getAppointmentTime();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        LocalDateTime appointmentDateTime = LocalDateTime.parse(dateTimeString, formatter);

        // Validate appointment is in future
        if (appointmentDateTime.isBefore(LocalDateTime.now())) {
            throw new Exception("Appointment time must be in the future");
        }

        // Create appointment
        Appointment appointment = new Appointment();
        appointment.setPatient(patient);
        appointment.setDoctorName(bookingDTO.getDoctorName());
        appointment.setDepartment(bookingDTO.getDepartment());
        appointment.setAppointmentDateTime(appointmentDateTime);
        appointment.setConsultationFee(bookingDTO.getConsultationFee());
        appointment.setSymptoms(bookingDTO.getSymptoms());
        appointment.setStatus(Appointment.AppointmentStatus.PENDING);

        return appointmentRepository.save(appointment);
    }

    /**
     * Get appointment by ID
     */
    public Appointment getAppointmentById(Long id) throws Exception {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new Exception("Appointment not found"));
    }

    /**
     * Get all appointments for a patient
     */
    public List<Appointment> getPatientAppointments(Long patientId) {
        return appointmentRepository.findByPatientId(patientId);
    }

    /**
     * Get all appointments
     */
    public List<Appointment> getAllAppointments() {
        return appointmentRepository.findAll();
    }

    /**
     * Cancel appointment
     */
    @Transactional
    public Appointment cancelAppointment(Long appointmentId) throws Exception {
        Appointment appointment = getAppointmentById(appointmentId);
        appointment.setStatus(Appointment.AppointmentStatus.CANCELLED);
        return appointmentRepository.save(appointment);
    }

    /**
     * Confirm appointment (after payment)
     */
    @Transactional
    public Appointment confirmAppointment(Long appointmentId) throws Exception {
        Appointment appointment = getAppointmentById(appointmentId);
        appointment.setStatus(Appointment.AppointmentStatus.CONFIRMED);
        return appointmentRepository.save(appointment);
    }

    /**
     * Complete appointment
     */
    @Transactional
    public Appointment completeAppointment(Long appointmentId, String notes) throws Exception {
        Appointment appointment = getAppointmentById(appointmentId);
        appointment.setStatus(Appointment.AppointmentStatus.COMPLETED);
        appointment.setNotes(notes);
        return appointmentRepository.save(appointment);
    }
}
