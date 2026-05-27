import os
import glob
import numpy as np
import pandas as pd
import librosa
from tqdm import tqdm

def load_demographics(demographics_path, diagnosis_path):
    # Load raw demographics
    df = pd.read_csv(demographics_path, sep=' ', names=['PatientID', 'Age', 'Sex', 'BMI', 'Weight', 'Height'])
    
    # Load raw diagnoses
    diag_df = pd.read_csv(diagnosis_path, header=None, names=['PatientID', 'Diagnosis'])
    
    # Merge on PatientID
    df = df.merge(diag_df, on='PatientID', how='inner')
    
    # Handle NA
    df['Age'] = pd.to_numeric(df['Age'], errors='coerce')
    df['BMI'] = pd.to_numeric(df['BMI'], errors='coerce')
    
    # Impute missing values
    df['Age'].fillna(df['Age'].mean(), inplace=True)
    df['BMI'].fillna(df['BMI'].mean(), inplace=True)
    df['Sex'].fillna('M', inplace=True)
    
    # Encode Sex: M -> 1, F -> 0
    df['Sex'] = df['Sex'].apply(lambda x: 1 if str(x).upper() == 'M' else 0)
    
    # Binary target: 1 if COPD, 0 otherwise
    df['COPD_Label'] = df['Diagnosis'].apply(lambda x: 1 if str(x).upper() == 'COPD' else 0)
    
    df.set_index('PatientID', inplace=True)
    return df

def extract_features(audio_path, start, end, target_sr=8000, target_duration=5.0):
    y, sr = librosa.load(audio_path, sr=target_sr, offset=start, duration=end-start)
    
    # Pad or truncate to target_duration
    target_samples = int(target_sr * target_duration)
    if len(y) < target_samples:
        padding = target_samples - len(y)
        y = np.pad(y, (0, padding), 'constant')
    else:
        y = y[:target_samples]
        
    # Mel Spectrogram
    melspec = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=64, hop_length=256, n_fft=1024)
    log_melspec = librosa.power_to_db(melspec, ref=np.max)
    
    # Add channel dimension for CNN (64, 157, 1)
    log_melspec = np.expand_dims(log_melspec, axis=-1)
    return log_melspec

def process_dataset(data_dir, demographics_df, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    
    txt_files = glob.glob(os.path.join(data_dir, '*.txt'))
    
    X_audio = []
    X_clinical = []
    y_labels = []
    
    print(f"Found {len(txt_files)} annotation files. Processing...")
    
    for txt_file in tqdm(txt_files):
        filename = os.path.basename(txt_file)
        patient_id = int(filename.split('_')[0])
        
        # Get clinical data & COPD diagnosis
        if patient_id not in demographics_df.index:
            continue
        clinical_data = demographics_df.loc[patient_id]
        age = clinical_data['Age']
        sex = clinical_data['Sex']
        bmi = clinical_data['BMI']
        copd_label = int(clinical_data['COPD_Label'])
        
        wav_file = txt_file.replace('.txt', '.wav')
        
        with open(txt_file, 'r') as f:
            lines = f.readlines()
            
        for line in lines:
            parts = line.strip().split('\t')
            if len(parts) < 4:
                continue
            
            start = float(parts[0])
            end = float(parts[1])
            
            try:
                features = extract_features(wav_file, start, end)
                X_audio.append(features)
                X_clinical.append([age, sex, bmi])
                y_labels.append(copd_label)
            except Exception as e:
                print(f"Error processing {wav_file} from {start} to {end}: {e}")
                
    X_audio = np.array(X_audio)
    X_clinical = np.array(X_clinical)
    y_labels = np.array(y_labels)
    
    print(f"Extracted {len(X_audio)} samples.")
    print("Saving to disk...")
    
    np.save(os.path.join(output_dir, 'X_audio.npy'), X_audio)
    np.save(os.path.join(output_dir, 'X_clinical.npy'), X_clinical)
    np.save(os.path.join(output_dir, 'y_labels.npy'), y_labels)
    print("Done!")

if __name__ == '__main__':
    demo_path = 'archive/demographic_info.txt'
    diag_path = 'archive/Respiratory_Sound_Database/Respiratory_Sound_Database/patient_diagnosis.csv'
    audio_dir = 'archive/Respiratory_Sound_Database/Respiratory_Sound_Database/audio_and_txt_files'
    out_dir = 'ml_data'
    
    demographics = load_demographics(demo_path, diag_path)
    process_dataset(audio_dir, demographics, out_dir)
