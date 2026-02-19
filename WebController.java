package com.medical.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebController {

    // * Home page

    @GetMapping("/")
    public String home() {
        return "index";
    }


     //* Book appointment page

    @GetMapping("/book-appointment")
    public String bookAppointment() {
        return "book-appointment";  // just filename, no path or .html
    }


   //  * Payment page

    @GetMapping("/payment")
    public String payment() {
        return "payment";
    }


     // * Success page

    @GetMapping("/success")
    public String success() {
        return "success";
    }


   //  * My appointments page

    @GetMapping("/appointments")
    public String appointments() {
        return "appointments";
    }

}
