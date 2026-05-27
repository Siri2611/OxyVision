import sys
import json
import warnings
warnings.filterwarnings('ignore') # Ignore librosa warnings
import librosa
import numpy as np

def extract(audio_path):
    target_sr = 8000
    target_duration = 5.0
    
    try:
        y, sr = librosa.load(audio_path, sr=target_sr)
        
        target_samples = int(target_sr * target_duration)
        if len(y) < target_samples:
            padding = target_samples - len(y)
            y = np.pad(y, (0, padding), 'constant')
        else:
            y = y[:target_samples]
            
        melspec = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=64, hop_length=256, n_fft=1024)
        log_melspec = librosa.power_to_db(melspec, ref=np.max)
        log_melspec = np.expand_dims(log_melspec, axis=-1)
        
        # We need to return a list representing the [1, 64, 157, 1] array
        # Expand dims to add batch size
        log_melspec = np.expand_dims(log_melspec, axis=0)
        
        print(json.dumps({"success": True, "features": log_melspec.tolist()}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == '__main__':
    if len(sys.argv) > 1:
        extract(sys.argv[1])
    else:
        print(json.dumps({"success": False, "error": "No audio path provided"}))
