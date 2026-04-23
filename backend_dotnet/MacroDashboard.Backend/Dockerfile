# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy csproj and restore
COPY ["backend_dotnet/MacroDashboard.Backend/MacroDashboard.Backend.csproj", "backend_dotnet/MacroDashboard.Backend/"]
RUN dotnet restore "backend_dotnet/MacroDashboard.Backend/MacroDashboard.Backend.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/backend_dotnet/MacroDashboard.Backend"
RUN dotnet build "MacroDashboard.Backend.csproj" -c Release -o /app/build

# Publish
FROM build AS publish
RUN dotnet publish "MacroDashboard.Backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MacroDashboard.Backend.dll"]
