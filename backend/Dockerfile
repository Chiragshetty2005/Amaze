FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY AmazeCare.slnx ./
COPY src/AmazeCare.Domain/AmazeCare.Domain.csproj src/AmazeCare.Domain/
COPY src/AmazeCare.Application/AmazeCare.Application.csproj src/AmazeCare.Application/
COPY src/AmazeCare.Infrastructure/AmazeCare.Infrastructure.csproj src/AmazeCare.Infrastructure/
COPY src/AmazeCare.Api/AmazeCare.Api.csproj src/AmazeCare.Api/
COPY tests/AmazeCare.UnitTests/AmazeCare.UnitTests.csproj tests/AmazeCare.UnitTests/
RUN dotnet restore AmazeCare.slnx

COPY . .
RUN dotnet publish src/AmazeCare.Api/AmazeCare.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "AmazeCare.Api.dll"]
