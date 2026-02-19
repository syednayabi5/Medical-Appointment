package com.medical;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MedicalAppointmentApplication {

	public static void main(String[] args) {
        SpringApplication.run(MedicalAppointmentApplication.class, args);
        System.out.println("\n========================================");
        System.out.println("Medical Appointment System Started!");
        System.out.println("Access the application at: http://localhost:8081");
        System.out.println("========================================\n");

	}
}
