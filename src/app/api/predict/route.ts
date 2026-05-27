import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob;
    const age = formData.get('age') as string;
    const sex = formData.get('sex') as string;
    const bmi = formData.get('bmi') as string;
    const isLive = (formData.get('isLive') as string) || 'false';
    
    if (!audioFile) {
      return NextResponse.json({ success: false, error: 'No audio provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const tempFilePath = path.join('/tmp', `audio_${Date.now()}.wav`);
    
    await writeFile(tempFilePath, buffer);

    const pythonScript = path.join(process.cwd(), 'scripts', 'predict.py');
    const { stdout, stderr } = await execAsync(`PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python python3 ${pythonScript} ${tempFilePath} ${age} ${sex} ${bmi} ${isLive}`);
    
    try {
      const result = JSON.parse(stdout);
      return NextResponse.json(result);
    } catch (parseError) {
      console.error('Failed to parse python output:', stdout, stderr);
      return NextResponse.json({ success: false, error: 'Python output parsing failed' }, { status: 500 });
    }

  } catch (error) {
    console.error('API Predict Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process audio' }, { status: 500 });
  }
}
