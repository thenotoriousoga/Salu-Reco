# syntax=docker/dockerfile:1.7
# tools: Gradle Wrapper 生成、pnpm 操作、psql、ファイル操作などの汎用ツールコンテナ
FROM eclipse-temurin:21-jdk

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

RUN apt-get update && apt-get install -y --no-install-recommends \
        curl ca-certificates gnupg git unzip zip procps \
        postgresql-client locales \
    && locale-gen C.UTF-8 \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && curl -L https://services.gradle.org/distributions/gradle-8.14-bin.zip -o /tmp/gradle.zip \
    && unzip -q /tmp/gradle.zip -d /opt \
    && rm /tmp/gradle.zip \
    && ln -s /opt/gradle-8.14/bin/gradle /usr/local/bin/gradle \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

CMD ["bash"]
