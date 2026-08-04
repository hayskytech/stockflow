// StockFlow deploy pipeline — cPanel via FTP (files) + SSH (npm install) + cPanel API (restart).
// Manual trigger only ("Build Now"). Jenkins controller/agent here is Windows, so shell-outs use
// `bat`/`powershell` rather than `sh`. See deployment_guide.md for the one-time Jenkins/cPanel setup
// this pipeline assumes (FTP server config, SSH key credential, API token, nodevenv path).
pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
    }

    parameters {
        booleanParam(name: 'DEPLOY_FRONTEND', defaultValue: true, description: 'Build & upload the frontend')
        booleanParam(name: 'DEPLOY_BACKEND', defaultValue: true, description: 'Upload backend source, npm install and restart the Node app')
        string(name: 'VITE_API_URL', defaultValue: 'https://wholesale.southcenter.in/api', description: 'Baked into the frontend build as VITE_API_URL')
    }

    environment {
        // Jenkins > Manage Jenkins > System > Publish over FTP — name of the configured server entry.
        // Configure it with the FTP host/credentials and leave its "Remote Directory" blank so the
        // per-stage remoteDirectory below (relative to the FTP home) is what actually applies.
        FTP_SERVER_ID       = 'southcenter'
        FRONTEND_REMOTE_DIR = 'wholesale.southcenter.in'
        // Application root is nested inside the frontend's doc root (confirmed) rather than a
        // sibling folder — make sure cPanel's Node.js Selector .htaccess is actually proxying this
        // whole path to the app; otherwise files like package.json become directly downloadable.
        BACKEND_REMOTE_DIR  = 'wholesale.southcenter.in/api'

        CPANEL_SSH_HOST = 'southcenter.in' // confirm this host actually accepts SSH for this account
        CPANEL_SSH_PORT = '22'             // confirm — many shared cPanel hosts use a non-standard port
        CPANEL_USER     = 'southcenter'    // cPanel account username (needed for the nodevenv path)
        NODE_VERSION    = '20'             // must match the version picked in Setup Node.js App

        // Actual cPanel server hostname (confirmed via browser DevTools) — not the vanity domain,
        // since that's what the CloudLinux Selector CGI endpoint actually lives on.
        CPANEL_API_HOST = 's3607.bom1.stableserver.net:2083'
        CPANEL_APP_NAME = 'wholesale.southcenter.in/api' // the app-root param the selector expects
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
