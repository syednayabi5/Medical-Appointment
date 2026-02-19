package com.medical.repository;

import com.medical.model.Appointment;
import com.medical.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment,Long> {
    List<Appointment> findByPatient(Patient patient);
    List<Appointment> findByPatientId(Long patientId);
    List<Appointment> findByDoctorName(String doctorName);
    List<Appointment> findByAppointmentDateTimeBetween(LocalDateTime start, LocalDateTime end);
    List<Appointment> findByStatus(Appointment.AppointmentStatus status);

}
