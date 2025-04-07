# Imagen base: Ubuntu LTS
FROM ubuntu:22.04

# Evita prompts interactivos
ARG DEBIAN_FRONTEND=noninteractive

# Parámetros del usuario que usará el contenedor
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Instala dependencias básicas
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    sudo \
    ca-certificates \
    gnupg \
    lsb-release \
    unzip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Crea un usuario no-root para desarrollo
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# --- Instalación de Node.js LTS (sin nvm) ---
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - \
    && sudo apt-get install -y nodejs

# --- Instalación de Deno ---
USER $USERNAME
RUN curl -fsSL https://deno.land/x/install/install.sh | sh

# Configura PATH para Deno
ENV DENO_INSTALL="/home/$USERNAME/.deno"
ENV PATH="$DENO_INSTALL/bin:$PATH"

# Verificación de versiones
RUN node --version
RUN npm --version
RUN deno --version

# Directorio de trabajo por defecto
WORKDIR /workspaces

# [Opcional] comando por defecto
CMD ["sleep", "infinity"]
