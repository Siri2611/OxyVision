import os
import shutil
import pandas as pd
import glob

def setup_demo_samples():
    diag_path = 'archive/Respiratory_Sound_Database/Respiratory_Sound_Database/patient_diagnosis.csv'
    audio_dir = 'archive/Respiratory_Sound_Database/Respiratory_Sound_Database/audio_and_txt_files'
    
    # Target folders
    pos_dir = 'demo_samples/positive_copd'
    neg_dir = 'demo_samples/negative_non_copd'
    os.makedirs(pos_dir, exist_ok=True)
    os.makedirs(neg_dir, exist_ok=True)
    
    # Load diagnoses
    diag_df = pd.read_csv(diag_path, header=None, names=['PatientID', 'Diagnosis'])
    
    # Find all wav files
    wav_files = glob.glob(os.path.join(audio_dir, '*.wav'))
    
    pos_count = 0
    neg_count = 0
    
    for wav_path in wav_files:
        filename = os.path.basename(wav_path)
        patient_id = int(filename.split('_')[0])
        
        patient_row = diag_df[diag_df['PatientID'] == patient_id]
        if patient_row.empty:
            continue
            
        diagnosis = str(patient_row.iloc[0]['Diagnosis']).upper()
        
        # We copy up to 5 files for each category
        if diagnosis == 'COPD' and pos_count < 5:
            dest = os.path.join(pos_dir, filename)
            shutil.copy(wav_path, dest)
            # Also copy the txt description if needed, or just wav
            shutil.copy(wav_path.replace('.wav', '.txt'), dest.replace('.wav', '.txt'))
            pos_count += 1
            print(f"Copied positive sample: {filename} (COPD)")
            
        elif diagnosis != 'COPD' and diagnosis != 'NA' and neg_count < 5:
            dest = os.path.join(neg_dir, filename)
            shutil.copy(wav_path, dest)
            shutil.copy(wav_path.replace('.wav', '.txt'), dest.replace('.wav', '.txt'))
            neg_count += 1
            print(f"Copied negative sample: {filename} ({diagnosis})")
            
        if pos_count >= 5 and neg_count >= 5:
            break

if __name__ == '__main__':
    setup_demo_samples()
