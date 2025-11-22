import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const configFilePath = path.join(process.cwd(), 'config.json')

interface GameConfig {
  questionsPerRound: number
}

const defaultConfig: GameConfig = {
  questionsPerRound: 20,
}

function getConfig(): GameConfig {
  try {
    if (!fs.existsSync(configFilePath)) {
      // Create default config file if it doesn't exist
      fs.writeFileSync(configFilePath, JSON.stringify(defaultConfig, null, 2))
      return defaultConfig
    }
    const fileContents = fs.readFileSync(configFilePath, 'utf8')
    const config = JSON.parse(fileContents)
    // Ensure all required fields exist
    return {
      ...defaultConfig,
      ...config,
    }
  } catch (error) {
    console.error(`Error reading config.json at ${configFilePath}:`, error)
    return defaultConfig
  }
}

function saveConfig(config: GameConfig): void {
  try {
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error(`Error writing to config.json at ${configFilePath}:`, error)
    throw error
  }
}

// GET /api/config - Get current configuration
export async function GET() {
  try {
    const config = getConfig()
    return NextResponse.json(config, { status: 200 })
  } catch (error) {
    console.error('Error fetching config:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        error: 'Failed to fetch config',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

// PUT /api/config - Update configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { questionsPerRound } = body

    // Validation
    if (questionsPerRound === undefined || questionsPerRound === null) {
      return NextResponse.json(
        { error: 'Missing required field: questionsPerRound' },
        { status: 400 }
      )
    }

    if (typeof questionsPerRound !== 'number' || questionsPerRound < 1) {
      return NextResponse.json(
        { error: 'questionsPerRound must be a positive number' },
        { status: 400 }
      )
    }

    const currentConfig = getConfig()
    const updatedConfig: GameConfig = {
      ...currentConfig,
      questionsPerRound: Math.floor(questionsPerRound), // Ensure it's an integer
    }

    saveConfig(updatedConfig)

    return NextResponse.json(updatedConfig, { status: 200 })
  } catch (error) {
    console.error('Error updating config:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        error: 'Failed to update config',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

