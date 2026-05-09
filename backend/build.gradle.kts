plugins {
    kotlin("jvm") version "2.3.21"
    kotlin("plugin.spring") version "2.3.21"
    kotlin("plugin.jpa") version "2.3.21"
    id("org.springframework.boot") version "4.0.6"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.salurec"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    // Spring Boot 4.0 では flyway-core 単体で自動設定が効かないため starter も追加する
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.postgresql:postgresql")
    // Note: hypersistence-utils (JSONB マッピング用) は Phase 5 で Hibernate 7 対応版を追加する

    implementation("com.github.f4b6a3:uuid-creator:6.0.0")

    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")

    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.7.0")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    // Spring Boot 4.0 でモジュール分割されたため、MockMvc 用の companion スターターを追加する
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    // Spring Boot 4.0 では Security と MockMvc の自動統合にこのスターターが必要
    testImplementation("org.springframework.boot:spring-boot-starter-security-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("io.kotest:kotest-runner-junit5:5.9.1")
    testImplementation("io.kotest:kotest-assertions-core:5.9.1")
    testImplementation("io.mockk:mockk:1.13.13")
    testImplementation("org.testcontainers:postgresql:1.20.3")
    testImplementation("org.testcontainers:junit-jupiter:1.20.3")
    testImplementation("com.tngtech.archunit:archunit-junit5:1.3.0")
    testImplementation("p6spy:p6spy:3.9.1")
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.add("-Xjsr305=strict")
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
    // Docker-out-of-Docker 環境(backend コンテナ内から兄弟コンテナ起動)で
    // Ryuk コンテナへの接続が不安定になるため無効化する。
    // CI/ローカルの素の Docker 上で実行する場合は有効でも問題ない。
    environment("TESTCONTAINERS_RYUK_DISABLED", "true")
    // Testcontainers のコンテナ再利用を有効化してテストの2回目以降を高速化
    systemProperty("testcontainers.reuse.enable", "true")

    // 並列実行。SpringBoot の ApplicationContext はクラスごとに共有されるため
    // forkEvery=0 でフォークを増やさず、並列 fork 数だけ増やす。
    maxParallelForks = (Runtime.getRuntime().availableProcessors() / 2).coerceAtLeast(1)
    forkEvery = 0L

    // JVM 起動オーバーヘッドを下げる
    jvmArgs("-XX:+UseParallelGC", "-XX:TieredStopAtLevel=1", "-noverify")
}
