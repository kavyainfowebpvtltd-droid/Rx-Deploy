FROM maven:3.9.6-eclipse-temurin-21

WORKDIR /app

COPY . .

RUN mvn clean package -DskipTests

EXPOSE 8081

CMD ["java", "-jar", "target/rxincredible-backend-1.0.0.jar"]
