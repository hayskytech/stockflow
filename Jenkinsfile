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
        booleanParam(name: 'NODE_INSTALL', defaultValue: false, description: 'npm install backend packages in CPANEL')
        booleanParam(name: 'NODE_RESTART', defaultValue: false, description: 'Restart backend process in CPANEL')
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

        CPANEL_API_HOST = 'wholesale.southcenter.in:2083'
        CPANEL_APP_NAME = 'wholesale.southcenter.in/api' // confirm this is the exact value NodeJSSelector::restart_app expects for a nested app root — see deployment_guide.md
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
       
        stage('Install backend deps on server (SSH)') {
            when { expression { params.NODE_INSTALL } }
            steps {
                // "SSH Username with private key" credential — bound as a temp key file, no ssh-agent
                // process needed (the SSH Agent plugin is unreliable on plain Windows agents).
                withCredentials([sshUserPrivateKey(credentialsId: 'cpanel-ssh-key', keyFileVariable: 'SSH_KEY')]) {
                    // Activates cPanel's per-app nodevenv so npm matches the Node version picked in
                    // Setup Node.js App. A plain system `npm install` would use the wrong Node/ABI and
                    // can break native deps like `sharp` (see deployment_guide.md).
                    powershell '''
                        # Win32-OpenSSH refuses to load a private key that's readable by anyone but the
                        # current user — the Jenkins credential-binding temp file inherits the workspace's
                        # default ACL (BUILTIN\\Users), so strip that before calling ssh. Grant to the
                        # exact running identity (via whoami) rather than $env:USERNAME, which resolves
                        # incorrectly when the Jenkins service runs as SYSTEM or another service account.
                        $currentUser = (whoami).Trim()
                        icacls "$($env:SSH_KEY)" /inheritance:r | Out-Null
                        icacls "$($env:SSH_KEY)" /grant:r "$($currentUser):R" | Out-Null

                        # BatchMode=yes: never fall back to an interactive password prompt — fail fast
                        # instead of hanging forever with no TTY to answer it.
                        $remoteCmd = "source /home/$($env:CPANEL_USER)/nodevenv/$($env:BACKEND_REMOTE_DIR)/$($env:NODE_VERSION)/bin/activate && cd /home/$($env:CPANEL_USER)/$($env:BACKEND_REMOTE_DIR) && npm install --omit=dev && deactivate"
                        ssh -o StrictHostKeyChecking=no -o BatchMode=yes -i "$($env:SSH_KEY)" -p $($env:CPANEL_SSH_PORT) "$($env:CPANEL_USER)@$($env:CPANEL_SSH_HOST)" $remoteCmd
                        if ($LASTEXITCODE -ne 0) { throw "ssh npm install failed with exit code $LASTEXITCODE" }
                    '''
                }
            }
        }

        stage('Restart backend app (cPanel API)') {
            when { expression { params.NODE_RESTART } }
            steps {
                withCredentials([string(credentialsId: 'cpanel-token', variable: 'CPANEL_API_TOKEN')]) {
                    powershell '''
                        $headers = @{ Authorization = "cpanel $($env:CPANEL_USER):$($env:CPANEL_API_TOKEN)" }
                        $url = "https://$($env:CPANEL_API_HOST)/execute/NodeJSSelector/restart_app?app_name=$([uri]::EscapeDataString($env:CPANEL_APP_NAME))"
                        $response = Invoke-RestMethod -Uri $url -Headers $headers
                        $response | ConvertTo-Json -Depth 5
                        if ($response.status -ne 1) { throw "restart_app reported failure: $($response | ConvertTo-Json -Depth 5)" }
                    '''
                }
            }
        }
        
    }

    post {
        success { echo 'Deploy finished.' }
        failure { echo 'Deploy failed — check the stage logs above before retrying.' }
    }
}
