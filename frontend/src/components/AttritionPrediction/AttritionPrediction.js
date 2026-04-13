import React, { useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiBarChart2, FiCheckCircle, FiRefreshCw, FiZap } from 'react-icons/fi';
import { attritionAPI } from '../../services/api';
import './AttritionPrediction.css';

const NUMERIC_FIELDS = new Set([
  'Age',
  'DailyRate',
  'DistanceFromHome',
  'Education',
  'EmployeeCount',
  'EmployeeNumber',
  'EnvironmentSatisfaction',
  'HourlyRate',
  'JobInvolvement',
  'JobLevel',
  'JobSatisfaction',
  'MonthlyIncome',
  'MonthlyRate',
  'NumCompaniesWorked',
  'PercentSalaryHike',
  'PerformanceRating',
  'RelationshipSatisfaction',
  'StandardHours',
  'StockOptionLevel',
  'TotalWorkingYears',
  'TrainingTimesLastYear',
  'WorkLifeBalance',
  'YearsAtCompany',
  'YearsInCurrentRole',
  'YearsSinceLastPromotion',
  'YearsWithCurrManager',
]);

const OPTIONS = {
  BusinessTravel: ['Non-Travel', 'Travel_Rarely', 'Travel_Frequently'],
  Department: ['Sales', 'Research & Development', 'Human Resources'],
  EducationField: ['Life Sciences', 'Medical', 'Marketing', 'Technical Degree', 'Human Resources', 'Other'],
  Gender: ['Male', 'Female'],
  JobRole: [
    'Sales Executive',
    'Research Scientist',
    'Laboratory Technician',
    'Manufacturing Director',
    'Healthcare Representative',
    'Manager',
    'Sales Representative',
    'Research Director',
    'Human Resources',
  ],
  MaritalStatus: ['Single', 'Married', 'Divorced'],
  Over18: ['Y'],
  OverTime: ['Yes', 'No'],
};

const SAMPLE_EMPLOYEE = {
  Age: 35,
  BusinessTravel: 'Travel_Rarely',
  DailyRate: 1102,
  Department: 'Sales',
  DistanceFromHome: 5,
  Education: 3,
  EducationField: 'Life Sciences',
  EmployeeCount: 1,
  EmployeeNumber: 9999,
  EnvironmentSatisfaction: 3,
  Gender: 'Male',
  HourlyRate: 94,
  JobInvolvement: 3,
  JobLevel: 2,
  JobRole: 'Sales Executive',
  JobSatisfaction: 4,
  MaritalStatus: 'Married',
  MonthlyIncome: 5993,
  MonthlyRate: 19479,
  NumCompaniesWorked: 1,
  Over18: 'Y',
  OverTime: 'No',
  PercentSalaryHike: 11,
  PerformanceRating: 3,
  RelationshipSatisfaction: 1,
  StandardHours: 80,
  StockOptionLevel: 0,
  TotalWorkingYears: 8,
  TrainingTimesLastYear: 0,
  WorkLifeBalance: 1,
  YearsAtCompany: 6,
  YearsInCurrentRole: 4,
  YearsSinceLastPromotion: 0,
  YearsWithCurrManager: 5,
};

const AttritionPrediction = () => {
  const [featureColumns, setFeatureColumns] = useState(Object.keys(SAMPLE_EMPLOYEE));
  const [formData, setFormData] = useState(SAMPLE_EMPLOYEE);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSchema = async () => {
      setSchemaLoading(true);
      try {
        const response = await attritionAPI.getSchema();
        const columns = response?.data?.feature_columns;
        if (Array.isArray(columns) && columns.length > 0) {
          setFeatureColumns(columns);
          setFormData((prev) => {
            const next = {};
            columns.forEach((column) => {
              next[column] = prev[column] ?? SAMPLE_EMPLOYEE[column] ?? '';
            });
            return next;
          });
        }
      } catch (schemaError) {
        console.error('Schema load failed, continuing with sample structure.', schemaError);
      } finally {
        setSchemaLoading(false);
      }
    };

    loadSchema();
  }, []);

  const riskMeta = useMemo(() => {
    if (!result || typeof result.probability_attrition !== 'number') {
      return { level: 'Unknown', tone: 'neutral' };
    }

    const p = result.probability_attrition;
    if (p >= 0.6) return { level: 'High Risk', tone: 'high' };
    if (p >= 0.3) return { level: 'Medium Risk', tone: 'medium' };
    return { level: 'Low Risk', tone: 'low' };
  }, [result]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const buildPayload = () => {
    const payload = {};
    featureColumns.forEach((column) => {
      const rawValue = formData[column];
      if (NUMERIC_FIELDS.has(column)) {
        payload[column] = rawValue === '' || rawValue === null ? null : Number(rawValue);
      } else {
        payload[column] = rawValue;
      }
    });
    return payload;
  };

  const handlePredict = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const payload = buildPayload();
      const response = await attritionAPI.predict(payload);
      setResult(response.data);
    } catch (predictError) {
      setError(
        predictError?.response?.data?.error ||
        'Prediction failed. Please verify all fields and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError('');
    setFormData((prev) => {
      const next = {};
      featureColumns.forEach((column) => {
        next[column] = SAMPLE_EMPLOYEE[column] ?? prev[column] ?? '';
      });
      return next;
    });
  };

  return (
    <div className="attrition-page">
      <section className="attrition-hero">
        <div className="hero-copy">
          <h1>Attrition Prediction</h1>
          <p>Estimate attrition probability for an employee profile and review risk instantly.</p>
        </div>
        <div className="hero-meta">
          <div className="meta-chip">
            <FiBarChart2 />
            <span>{featureColumns.length} model features</span>
          </div>
          <div className="meta-chip">
            <FiZap />
            <span>{schemaLoading ? 'Loading schema...' : 'Schema ready'}</span>
          </div>
        </div>
      </section>

      <form className="attrition-card" onSubmit={handlePredict}>
        <div className="card-header">
          <h2>Employee Input</h2>
          <div className="header-actions">
            <button type="button" className="ghost-btn" onClick={handleReset}>
              <FiRefreshCw />
              Use Sample Values
            </button>
            <button type="submit" className="primary-btn" disabled={loading || schemaLoading}>
              {loading ? 'Predicting...' : 'Run Prediction'}
            </button>
          </div>
        </div>

        <div className="field-grid">
          {featureColumns.map((field) => {
            const value = formData[field] ?? '';
            const options = OPTIONS[field];
            const numeric = NUMERIC_FIELDS.has(field);

            return (
              <label key={field} className="field-item">
                <span className="field-label">{field}</span>
                {options ? (
                  <select
                    value={value}
                    onChange={(event) => handleChange(field, event.target.value)}
                    required
                  >
                    <option value="">Select</option>
                    {options.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={numeric ? 'number' : 'text'}
                    value={value}
                    step={numeric ? 'any' : undefined}
                    onChange={(event) => handleChange(field, event.target.value)}
                    placeholder={numeric ? 'Enter number' : 'Enter value'}
                    required
                  />
                )}
              </label>
            );
          })}
        </div>
      </form>

      {error && (
        <div className="feedback error">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <section className="result-panel">
          <div className="result-head">
            <h3>Prediction Result</h3>
            <span className={`risk-chip ${riskMeta.tone}`}>{riskMeta.level}</span>
          </div>

          <div className="result-grid">
            <article className="result-card">
              <p className="label">Predicted Attrition</p>
              <h4>{String(result.label)}</h4>
            </article>
            <article className="result-card">
              <p className="label">Model Output</p>
              <h4>{String(result.prediction)}</h4>
            </article>
            <article className="result-card">
              <p className="label">Attrition Probability</p>
              <h4>
                {typeof result.probability_attrition === 'number'
                  ? `${(result.probability_attrition * 100).toFixed(2)}%`
                  : 'N/A'}
              </h4>
            </article>
          </div>

          <p className="result-note">
            <FiCheckCircle />
            This prediction is for decision support and should be reviewed with domain context.
          </p>
        </section>
      )}
    </div>
  );
};

export default AttritionPrediction;
