properties(
    [
        githubProjectProperty(
            displayName: 'docker-imagemagick-api',
            projectUrlStr: 'https://github.com/ruepp-jenkins/docker-imagemagick-api/'
        ),
        disableConcurrentBuilds(abortPrevious: true)
    ]
)

pipeline {
    agent {
        label 'docker'
    }

    environment {
        IMAGE_FULLNAME = 'ruepp/imagemagick-api'
        DOCKER_API_PASSWORD = credentials('DOCKER_API_PASSWORD')
    }

    triggers {
        URLTrigger(
            cronTabSpec: 'H/30 * * * *',
            labelRestriction: 'urltrigger',
            entries: [
                URLTriggerEntry(
                    url: 'https://hub.docker.com/v2/namespaces/library/repositories/node/tags/lts-alpine',
                    contentTypes: [
                        JsonContent(
                            [
                                JsonContentEntry(jsonPath: '$.last_updated')
                            ]
                        )
                    ]
                )
            ]
        )
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: env.BRANCH_NAME, url: env.GIT_URL
            }
        }
        stage('Build') {
            steps {
                sh 'chmod +x scripts/*.sh'
                sh './scripts/start.sh'
            }
        }
    }

    post {
        always {
            discordSend result: currentBuild.currentResult,
                description: env.GIT_URL,
                link: env.BUILD_URL,
                title: JOB_NAME,
                webhookURL: DISCORD_WEBHOOK
            cleanWs()
        }
    }
}
