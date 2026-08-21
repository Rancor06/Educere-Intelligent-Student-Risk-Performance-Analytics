"""
Day 46 Task 01 — reproduces ml/dropout_model.pkl.

Mirrors the Phase 2 (Module 2, Days 19-20) Colab notebook exactly:
DecisionTreeClassifier(max_depth=8, class_weight="balanced",
random_state=42), trained on all 36 raw feature columns (no scaling —
trees don't need it), target encoded Dropout=0 / Enrolled=1 / Graduate=2.

Run once from backend/backend/:
    python ml/train_model.py

Source data: data.csv — the UCI "Predict students' dropout and academic
success" dataset.
"""

import os
import pickle

import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

HERE = os.path.dirname(__file__)
DATA_PATH = os.path.join(HERE, "..", "data.csv")
MODEL_PATH = os.path.join(HERE, "dropout_model.pkl")


def main():
    df = pd.read_csv(DATA_PATH, sep=";")

    X = df.drop("Target", axis=1)
    y = df["Target"].map({"Dropout": 0, "Enrolled": 1, "Graduate": 2})

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = DecisionTreeClassifier(max_depth=8, random_state=42, class_weight="balanced")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("Train accuracy:", model.score(X_train, y_train))
    print("Test accuracy:", accuracy_score(y_test, y_pred))

    target_names = ["Dropout", "Enrolled", "Graduate"]
    print("\nClassification Report:\n", classification_report(y_test, y_pred, target_names=target_names))
    print("\nConfusion Matrix:\n", confusion_matrix(y_test, y_pred))

    importances = pd.Series(model.feature_importances_, index=X.columns)
    print("\nTop 10 most important features:")
    print(importances.sort_values(ascending=False).head(10))

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)

    print(f"\nSaved {MODEL_PATH}")


if __name__ == "__main__":
    main()
