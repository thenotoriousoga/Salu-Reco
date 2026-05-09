# syntax=docker/dockerfile:1.7

# ---- Stage: 開発用 ----
FROM eclipse-temurin:21-jdk AS dev

# Testcontainers が兄弟コンテナを立ち上げるために Docker CLI を同梱する(Docker-out-of-Docker)
RUN apt-get update \
 && apt-get install -y --no-install-recommends docker.io \
 && rm -rf /var/lib/apt/lists/*

# Testcontainers のコンテナ再利用を有効化(ruby 再起動時に postgres を使い回す)。
# testcontainers.reuse.enable は $HOME/.testcontainers.properties から読み取る。
RUN mkdir -p /root && echo "testcontainers.reuse.enable=true" > /root/.testcontainers.properties

WORKDIR /app
EXPOSE 8080


# ---- Stage: 本番ビルド ----
FROM eclipse-temurin:21-jdk AS builder

WORKDIR /build
COPY gradle ./gradle
COPY gradlew settings.gradle.kts build.gradle.kts ./
RUN ./gradlew --no-daemon dependencies || true

COPY src ./src
RUN ./gradlew --no-daemon clean bootJar


# ---- Stage: 本番実行 ----
FROM eclipse-temurin:21-jre AS runtime

WORKDIR /app
COPY --from=builder /build/build/libs/*.jar app.jar

ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
