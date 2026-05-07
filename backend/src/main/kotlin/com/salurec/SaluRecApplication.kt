package com.salurec

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class SaluRecApplication

fun main(args: Array<String>) {
    runApplication<SaluRecApplication>(*args)
}
