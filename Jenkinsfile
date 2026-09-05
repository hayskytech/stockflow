// StockFlow deploy pipeline — cPanel via FTP (files) + SSH (npm install) + cPanel API (restart).
// Manual trigger only ("Build Now"). Jenkins controller/agent here is Windows, so shell-outs use
// `bat`/`powershell` rather than `sh`. See deployment_guide.md for the one-time Jenkins/cPanel setup
// this pipeline assumes (FTP server config, SSH key credential, API token, nodevenv path).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// OPERATOR SETUP — fill these in per deployment target (Jenkins job → "Build with Parameters"):
//
//   VITE_API_URL         Absolute URL the browser calls the API at, e.g.
//                        https://<app-domain>/api  (baked into the frontend build)
//   FTP_SERVER_ID        Name of the "Publish over FTP" server entry configured in
//                        Manage Jenkins → System (must match exactly)
//   FRONTEND_REMOTE_DIR  FTP path (relative to the FTP home) for the built frontend,
//                        typically the subdomain doc root, e.g. <app-domain>
//   BACKEND_REMOTE_DIR   FTP path for the backend source — nested inside the frontend
//                        doc root, e.g. <app-domain>/api
//   CPANEL_SSH_HOST      Hostname that accepts SSH for the cPanel account
//   CPANEL_SSH_PORT      SSH port (many shared cPanel hosts use a non-standard port, not 22)
//   CPANEL_USER          cPanel account username (needed for the per-app nodevenv path)
//   CPANEL_API_HOST      Actual cPanel server hostname:port for the UAPI/CGI endpoint
//                        (the real server, not the vanity domain), e.g.
//                        server123.provider.example.net:2083
//   CPANEL_APP_NAME      The app-root value the CloudLinux Node.js Selector expects,
//                        usually the same as BACKEND_REMOTE_DIR, e.g. <app-domain>/api
//   NODE_VERSION         Node major version — must match the one picked in Setup Node.js App
//
// Credentials (Manage Jenkins → Credentials), referenced by id, NOT parameterised here:
//   cpanel-ssh-key       "SSH Username with private key" for CPANEL_USER
//   cpanel-api-token     "Secret text" — cPanel API token for the restart call
// ─────────────────────────────────────────────────────────────────────────────────────────────
pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
    }

    parameters {
        booleanParam(name: 'DEPLOY_FRONTEND', defaultValue: true, description: 'Build & upload the frontend')
        booleanParam(name: 'DEPLOY_BACKEND', defaultValue: true, description: 'Upload backend source, npm install and restart the Node app')

        string(name: 'VITE_API_URL', defaultValue: 'https://your-domain.example/api', description: 'Absolute API URL baked into the frontend build as VITE_API_URL')

        // Jenkins > Manage Jenkins > System > Publish over FTP — name of the configured server entry.
        // Configure it with the FTP host/credentials and leave its "Remote Directory" blank so the
        // per-stage remoteDirectory below (relative to the FTP home) is what actually applies.
        string(name: 'FTP_SERVER_ID', defaultValue: 'your-ftp-server-id', description: 'Name of the "Publish over FTP" server entry in Jenkins system config')
        string(name: 'FRONTEND_REMOTE_DIR', defaultValue: 'your-domain.example', description: 'FTP path (relative to FTP home) for the built frontend — usually the subdomain doc root')
        // Application root is nested inside the frontend's doc root rather than a sibling folder —
        // make sure cPanel's Node.js Selector .htaccess is actually proxying this whole path to the
        // app; otherwise files like package.json become directly downloadable.
        string(name: 'BACKEND_REMOTE_DIR', defaultValue: 'your-domain.example/api', description: 'FTP path for the backend source — nested inside the frontend doc root')

        string(name: 'CPANEL_SSH_HOST', defaultValue: '', description: 'Hostname that accepts SSH for this cPanel account')
        string(name: 'CPANEL_SSH_PORT', defaultValue: '22', description: 'SSH port — many shared cPanel hosts use a non-standard port')
        string(name: 'CPANEL_USER', defaultValue: 'your-cpanel-user', description: 'cPanel account username (needed for the nodevenv path)')
        string(name: 'NODE_VERSION', defaultValue: '20', description: 'Node major version — must match the version picked in Setup Node.js App')

        // Actual cPanel server hostname:port for the CloudLinux Selector CGI endpoint — not the
        // vanity domain, since that's where the endpoint actually lives (confirm via browser DevTools).
        string(name: 'CPANEL_API_HOST', defaultValue: 'your-cpanel-server.example.net:2083', description: 'Real cPanel server hostname:port for the API/CGI endpoint')
        string(name: 'CPANEL_APP_NAME', defaultValue: 'your-domain.example/api', description: 'The app-root param the Node.js Selector expects (usually same as BACKEND_REMOTE_DIR)')
    }

    environment {
        // Mirror the build parameters into environment vars so the stages below stay unchanged.
        FTP_SERVER_ID       = "${params.FTP_SERVER_ID}"
        FRONTEND_REMOTE_DIR = "${params.FRONTEND_REMOTE_DIR}"
        BACKEND_REMOTE_DIR  = "${params.BACKEND_REMOTE_DIR}"

        CPANEL_SSH_HOST = "${params.CPANEL_SSH_HOST}"
        CPANEL_SSH_PORT = "${params.CPANEL_SSH_PORT}"
        CPANEL_USER     = "${params.CPANEL_USER}"
        NODE_VERSION    = "${params.NODE_VERSION}"

        CPANEL_API_HOST = "${params.CPANEL_API_HOST}"
        CPANEL_APP_NAME = "${params.CPANEL_APP_NAME}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build frontend') {
            when { expression { params.DEPLOY_FRONTEND } }
            steps {
                dir('frontend') {
                    writeFile file: '.env.production', text: "VITE_API_URL=${params.VITE_API_URL}\n"
                    bat 'npm ci'
                    bat 'npm run build'
                }
            }
        }

        stage('Deploy frontend (FTP)') {
            when { expression { params.DEPLOY_FRONTEND } }
            steps {
                ftpPublisher(
                    publishers: [[
                        configName: env.FTP_SERVER_ID,
                        transfers: [[
                            sourceFiles: 'frontend/dist/**',
                            removePrefix: 'frontend/dist',
                            remoteDirectory: env.FRONTEND_REMOTE_DIR,
                            excludes: '',
                            flatten: false,
                            cleanRemote: false
                        ]],
                        useWorkspaceInPromotion: false,
                        usePromotionTimestamp: false
                    ]],
                    continueOnError: false,
                    failOnError: true,
                    alwaysPublishFromMaster: false,
                    masterNodeName: '',
                    paramPublish: null
                )
            }
        }

        stage('Deploy backend source (FTP)') {
            when { expression { params.DEPLOY_BACKEND } }
            steps {
                // src/ + manifest only — never .env or uploads/, both live exclusively on the server.
                ftpPublisher(
                    publishers: [[
                        configName: env.FTP_SERVER_ID,
                        transfers: [[
                            sourceFiles: 'backend/src/**,backend/package.json,backend/package-lock.json',
                            removePrefix: 'backend',
                            remoteDirectory: env.BACKEND_REMOTE_DIR,
                            excludes: '',
                            flatten: false,
                            cleanRemote: false
                        ]],
                        useWorkspaceInPromotion: false,
                        usePromotionTimestamp: false
                    ]],
                    continueOnError: false,
                    failOnError: true,
                    alwaysPublishFromMaster: false,
                    masterNodeName: '',
                    paramPublish: null
                )
            }
        }

    }

    post {
        success { echo 'Deploy finished.' }
        failure { echo 'Deploy failed — check the stage logs above before retrying.' }
    }
}
