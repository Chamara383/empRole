import os
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.environ.get("MODEL_PATH", os.path.join(BASE_DIR, "employee_attrition_model.pkl"))


def _load_artifacts(model_path: str) -> Tuple[Any, Optional[List[str]], Optional[List[str]]]:
	"""Load model bundle and extract model plus optional metadata."""
	if not os.path.exists(model_path):
		raise FileNotFoundError(f"Model file not found: {model_path}")

	loaded = joblib.load(model_path)

	if isinstance(loaded, dict):
		model = loaded.get("model")
		feature_columns = loaded.get("feature_columns")
		target_classes = loaded.get("target_classes")
		if model is None:
			raise ValueError("Bundle is missing 'model' key.")
	else:
		model = loaded
		feature_columns = None
		target_classes = None

	if feature_columns is None and hasattr(model, "feature_names_in_"):
		feature_columns = list(model.feature_names_in_)

	return model, feature_columns, target_classes


model, FEATURE_COLUMNS, TARGET_CLASSES = _load_artifacts(MODEL_PATH)

app = Flask(__name__)


def _to_native(value: Any) -> Any:
	"""Convert NumPy/Pandas scalar values to JSON-serializable Python types."""
	if isinstance(value, np.generic):
		return value.item()
	if isinstance(value, pd.Timestamp):
		return value.isoformat()
	return value


@app.get("/health")
def health() -> Any:
	return jsonify(
		{
			"status": "ok",
			"model_loaded": model is not None,
			"model_path": MODEL_PATH,
			"feature_count": len(FEATURE_COLUMNS) if FEATURE_COLUMNS else None,
		}
	)


@app.get("/api/health")
def api_health() -> Any:
	return health()


@app.get("/schema")
def schema() -> Any:
	return jsonify(
		{
			"feature_columns": FEATURE_COLUMNS or [],
			"target_classes": TARGET_CLASSES or [],
		}
	)


@app.get("/api/attrition/schema")
def api_attrition_schema() -> Any:
	return schema()


def _validate_payload(payload: Dict[str, Any]) -> Tuple[bool, str]:
	if not isinstance(payload, dict):
		return False, "Request body must be a JSON object."

	if FEATURE_COLUMNS is None:
		# Model-only pickle can still predict if a DataFrame is provided.
		return True, ""

	missing = [col for col in FEATURE_COLUMNS if col not in payload]
	extra = [key for key in payload.keys() if key not in FEATURE_COLUMNS]

	if missing:
		return False, f"Missing required fields: {missing}"
	if extra:
		return False, f"Unexpected fields: {extra}"

	return True, ""


@app.post("/predict")
def predict() -> Any:
	payload = request.get_json(silent=True)
	if payload is None:
		return jsonify({"error": "Invalid or missing JSON body."}), 400

	valid, error_msg = _validate_payload(payload)
	if not valid:
		return jsonify({"error": error_msg}), 400

	try:
		if FEATURE_COLUMNS:
			row = {col: payload[col] for col in FEATURE_COLUMNS}
			sample_df = pd.DataFrame([row], columns=FEATURE_COLUMNS)
		else:
			sample_df = pd.DataFrame([payload])

		pred = model.predict(sample_df)[0]
		proba = None
		if hasattr(model, "predict_proba"):
			probabilities = model.predict_proba(sample_df)[0]
			positive_idx = 1 if len(probabilities) > 1 else 0
			proba = float(_to_native(probabilities[positive_idx]))

		label = pred
		if TARGET_CLASSES and isinstance(pred, (int, float)):
			pred_idx = int(pred)
			if 0 <= pred_idx < len(TARGET_CLASSES):
				label = TARGET_CLASSES[pred_idx]

		prediction_value = _to_native(pred)
		label_value = _to_native(label)
		if isinstance(label_value, np.ndarray):
			label_value = label_value.tolist()

		return jsonify(
			{
				"prediction": prediction_value,
				"label": label_value,
				"probability_attrition": proba,
			}
		)
	except Exception as exc:
		return jsonify({"error": str(exc)}), 500


@app.post("/api/attrition/predict")
def api_attrition_predict() -> Any:
	return predict()


if __name__ == "__main__":
	port = int(os.environ.get("PORT", "8000"))
	app.run(host="0.0.0.0", port=port, debug=True)
