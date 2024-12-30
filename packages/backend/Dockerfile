# This dockerfile builds an image for the backend package.
# It should be built using the build.sh script inside of the backstage/scripts folder

FROM node:20-bookworm-slim

# Trick to set the environment of the image via a build argument so that it has it during runtime
ARG APP_CONFIG
ENV APP_CONFIG=${APP_CONFIG:-"app-config.yaml"}

# Set Python interpreter for `node-gyp` (build-dependency for isolated-vm) to use
ENV PYTHON=/usr/bin/python3

# Install isolated-vm dependencies, these are needed by the @backstage/plugin-scaffolder-backend.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends python3 g++ build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY --chown=node:node .yarn ./.yarn
COPY --chown=node:node .yarnrc.yml ./
COPY --chown=node:node backstage.json ./

# Install Cookiecutter dependencies
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get install -y --no-install-recommends python3-venv python3-pip

# Set up a virtual environment to bypass `externally-managed-environment` error
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Techdocs dependencies
# Info: https://backstage.io/docs/features/techdocs/getting-started#disabling-docker-in-docker-situation-optional
RUN pip3 install mkdocs-techdocs-core==1.2.3 mkdocs-material \
    mkdocs-same-dir mkdocs-awesome-pages-plugin \
    mkdocs-pdf-export-plugin mkdocs-minify-plugin

# Cookiecutter libraries + templating dependencies
RUN pip3 install cookiecutter termcolor

# From here on we use the least-privileged `node` user to run the backend.
USER node

# This should create the app dir as `node`.
# If it is instead created as `root` then the `tar` command below will fail: `can't create directory 'packages/': Permission denied`.
# If this occurs, then ensure BuildKit is enabled (`DOCKER_BUILDKIT=1`) so the app dir is correctly created as `node`.
WORKDIR /app

# This switches many Node.js dependencies to production mode, skipping dev-dependencies on yarn install.
ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-node-snapshot"

# Copy repo skeleton first, to avoid unnecessary docker cache invalidation.
# The skeleton contains the package.json of each package in the monorepo,
# and along with yarn.lock and the root package.json, that's enough to run yarn install.
COPY --chown=node:node yarn.lock package.json packages/backend/dist/skeleton.tar.gz ./
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

RUN --mount=type=cache,target=/home/node/.cache/yarn,sharing=locked,uid=1000,gid=1000 \
    yarn workspaces focus --all --production && rm -rf "$(yarn cache clean)" \

# Then copy the rest of the backend bundle, along with any other files we might want.
COPY --chown=node:node packages/backend/dist/bundle.tar.gz ${APP_CONFIG} ./
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

# Use Shell form to allow for environment variable substitution, has problems with exec form
# https://docs.docker.com/reference/dockerfile/#shell-and-exec-form
CMD node packages/backend --config ${APP_CONFIG}
