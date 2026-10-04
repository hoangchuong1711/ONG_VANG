# ================================
# Stage 1: Build Maven
# ================================
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml .

RUN mvn dependency:go-offline

COPY src ./src

RUN mvn clean package -DskipTests


# ================================
# Stage 2: Tomcat
# ================================
FROM tomcat:10.1-jdk21-temurin

# Xóa các web app mặc định của Tomcat
RUN rm -rf /usr/local/tomcat/webapps/*

# Deploy backend thành ROOT application
COPY --from=build \
    /app/target/backend.war \
    /usr/local/tomcat/webapps/ROOT.war

EXPOSE 8080

CMD ["catalina.sh", "run"]
