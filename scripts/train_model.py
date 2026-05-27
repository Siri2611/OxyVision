import os
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, regularizers
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
import tensorflowjs as tfjs

def build_acoustic_model(audio_shape, num_classes=2):
    """
    Pure Acoustic Convolutional Neural Network.
    Forces the network to learn genuine diagnostic acoustic features (wheezes, crackles, obstruction)
    strictly from Mel-Spectrogram inputs, eliminating the demographic age/BMI shortcut bias.
    """
    audio_input = layers.Input(shape=audio_shape, name='audio_input')
    
    x = layers.Conv2D(32, (3, 3), activation='relu', padding='same')(audio_input)
    x = layers.MaxPooling2D((2, 2))(x)
    x = layers.BatchNormalization()(x)
    
    x = layers.Conv2D(64, (3, 3), activation='relu', padding='same')(x)
    x = layers.MaxPooling2D((2, 2))(x)
    x = layers.BatchNormalization()(x)
    
    x = layers.Conv2D(128, (3, 3), activation='relu', padding='same')(x)
    x = layers.MaxPooling2D((2, 2))(x)
    x = layers.BatchNormalization()(x)
    
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(64, activation='relu', kernel_regularizer=regularizers.l2(0.01))(x)
    x = layers.Dropout(0.4)(x)
    
    output = layers.Dense(num_classes, activation='softmax', name='output')(x)
    
    model = models.Model(inputs=audio_input, outputs=output)
    return model

def main():
    print("Loading data...")
    X_audio = np.load('ml_data/X_audio.npy')
    y_labels = np.load('ml_data/y_labels.npy')
    
    print(f"Audio shape: {X_audio.shape}")
    print(f"Labels shape: {y_labels.shape}")
    
    # Check distribution
    unique, counts = np.unique(y_labels, return_counts=True)
    print(f"Class Distribution: {dict(zip(unique, counts))}")
    
    # One-hot encode labels (0: Non-COPD, 1: COPD)
    y_cat = tf.keras.utils.to_categorical(y_labels, num_classes=2)
    
    # Train-test split
    indices = np.arange(len(y_labels))
    train_idx, val_idx = train_test_split(indices, test_size=0.2, random_state=42, stratify=y_labels)
    
    X_audio_train, X_audio_val = X_audio[train_idx], X_audio[val_idx]
    y_train, y_val = y_cat[train_idx], y_cat[val_idx]
    
    # Calculate class weights to handle imbalance
    y_train_labels = y_labels[train_idx]
    classes = np.unique(y_train_labels)
    weights = compute_class_weight('balanced', classes=classes, y=y_train_labels)
    class_weights = dict(zip(classes, weights))
    print(f"Class Weights: {class_weights}")
    
    # Build model (2 classes: [Non-COPD, COPD])
    model = build_acoustic_model(
        audio_shape=X_audio.shape[1:],
        num_classes=2
    )
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    early_stop = tf.keras.callbacks.EarlyStopping(
        monitor='val_loss', 
        patience=10, 
        restore_best_weights=True
    )
    
    print("Training Pure Acoustic COPD Prediction Model...")
    history = model.fit(
        X_audio_train, y_train,
        validation_data=(X_audio_val, y_val),
        epochs=30,
        batch_size=32,
        class_weight=class_weights,
        callbacks=[early_stop],
        verbose=1
    )
    
    # Save standard Keras model
    os.makedirs('ml_model', exist_ok=True)
    model.save('ml_model/oxyvision_model.keras')
    
    # Export to TensorFlow.js format
    tfjs_target_dir = 'public/tfjs_model'
    print(f"Exporting model to {tfjs_target_dir} for browser inference...")
    tfjs.converters.save_keras_model(model, tfjs_target_dir)
    
    print("Training and Export Complete!")

if __name__ == '__main__':
    main()
