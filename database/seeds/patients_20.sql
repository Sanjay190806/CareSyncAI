-- 20 synthetic patients across 7 clinical archetypes

INSERT INTO patients (
    id, hospital_id, name, age, gender, room_number,
    diagnoses, medications, allergies, risk_category, profile_type
) VALUES
-- Healthy (3)
('a0000001-0000-4000-8000-000000000001', 'P-001', 'Margaret Chen', 34, 'Female', '201A',
 ARRAY['None'], ARRAY['Multivitamin'], ARRAY['None'], 'Low', 'Healthy'),
('a0000001-0000-4000-8000-000000000002', 'P-002', 'James Okafor', 28, 'Male', '202B',
 ARRAY['None'], ARRAY['None'], ARRAY['Penicillin'], 'Low', 'Healthy'),
('a0000001-0000-4000-8000-000000000003', 'P-003', 'Sofia Martinez', 45, 'Female', '203A',
 ARRAY['Mild Asthma'], ARRAY['Albuterol PRN'], ARRAY['Sulfa'], 'Low', 'Healthy'),

-- COPD (3) — includes Patient 7 demo profile
('a0000001-0000-4000-8000-000000000004', 'P-004', 'Robert Williams', 68, 'Male', '304B',
 ARRAY['COPD', 'Chronic Bronchitis'], ARRAY['Tiotropium', 'Albuterol', 'Prednisone'], ARRAY['Aspirin'], 'Moderate', 'COPD'),
('a0000001-0000-4000-8000-000000000005', 'P-005', 'Eleanor Hughes', 74, 'Female', '305A',
 ARRAY['COPD', 'Pulmonary Hypertension'], ARRAY['Budesonide/Formoterol', 'Oxygen 2L NC'], ARRAY['Codeine'], 'Moderate', 'COPD'),
('a0000001-0000-4000-8000-000000000007', 'P-007', 'Dorothy Brennan', 72, 'Female', '307C',
 ARRAY['COPD', 'Chronic Heart Failure'], ARRAY['Spiriva', 'Furosemide', 'Carvedilol'], ARRAY['Morphine'], 'High', 'COPD'),

-- Diabetes (3)
('a0000001-0000-4000-8000-000000000006', 'P-006', 'David Kim', 56, 'Male', '306A',
 ARRAY['Type 2 Diabetes', 'Diabetic Neuropathy'], ARRAY['Metformin', 'Insulin Glargine', 'Gabapentin'], ARRAY['None'], 'Moderate', 'Diabetes'),
('a0000001-0000-4000-8000-000000000008', 'P-008', 'Patricia Nguyen', 61, 'Female', '308B',
 ARRAY['Type 2 Diabetes', 'CKD Stage 3'], ARRAY['Metformin', 'Lisinopril', 'Atorvastatin'], ARRAY['Iodine Contrast'], 'Moderate', 'Diabetes'),
('a0000001-0000-4000-8000-000000000009', 'P-009', 'Michael Torres', 49, 'Male', '309A',
 ARRAY['Type 1 Diabetes'], ARRAY['Insulin Lispro', 'Insulin Detemir', 'CGM'], ARRAY['None'], 'Moderate', 'Diabetes'),

-- Hypertension (3)
('a0000001-0000-4000-8000-000000000010', 'P-010', 'Linda Patterson', 58, 'Female', '310B',
 ARRAY['Essential Hypertension', 'Hyperlipidemia'], ARRAY['Amlodipine', 'Losartan', 'Rosuvastatin'], ARRAY['None'], 'Moderate', 'Hypertension'),
('a0000001-0000-4000-8000-000000000011', 'P-011', 'William Foster', 65, 'Male', '311A',
 ARRAY['Hypertension', 'Atrial Fibrillation'], ARRAY['Metoprolol', 'Apixaban', 'HCTZ'], ARRAY['NSAIDs'], 'Moderate', 'Hypertension'),
('a0000001-0000-4000-8000-000000000012', 'P-012', 'Carol Simmons', 70, 'Female', '312C',
 ARRAY['Hypertensive Heart Disease'], ARRAY['Valsartan', 'Spironolactone'], ARRAY['ACE Inhibitors'], 'High', 'Hypertension'),

-- Heart Failure (3)
('a0000001-0000-4000-8000-000000000013', 'P-013', 'George Anderson', 76, 'Male', '401A',
 ARRAY['Congestive Heart Failure', 'CAD'], ARRAY['Furosemide', 'Sacubitril/Valsartan', 'Carvedilol'], ARRAY['None'], 'High', 'Heart Failure'),
('a0000001-0000-4000-8000-000000000014', 'P-014', 'Helen Crawford', 79, 'Female', '402B',
 ARRAY['HFrEF', 'Atrial Fibrillation'], ARRAY['Bumetanide', 'Digoxin', 'Apixaban'], ARRAY['Potassium Supplements'], 'High', 'Heart Failure'),
('a0000001-0000-4000-8000-000000000015', 'P-015', 'Richard Powell', 68, 'Male', '403A',
 ARRAY['HFpEF', 'Hypertension'], ARRAY['Torsemide', 'Dapagliflozin'], ARRAY['None'], 'High', 'Heart Failure'),

-- Post Surgery (2)
('a0000001-0000-4000-8000-000000000016', 'P-016', 'Susan Mitchell', 54, 'Female', '501B',
 ARRAY['Post Cholecystectomy'], ARRAY['Acetaminophen', 'Ondansetron'], ARRAY['Latex'], 'Moderate', 'Post Surgery'),
('a0000001-0000-4000-8000-000000000017', 'P-017', 'Thomas Reed', 62, 'Male', '502A',
 ARRAY['Post Total Knee Arthroplasty'], ARRAY['Oxycodone PRN', 'Enoxaparin', 'Celecoxib'], ARRAY['Morphine'], 'Moderate', 'Post Surgery'),

-- ICU Critical (3)
('a0000001-0000-4000-8000-000000000018', 'P-018', 'Karen Phillips', 58, 'Female', 'ICU-01',
 ARRAY['Septic Shock', 'Pneumonia'], ARRAY['Norepinephrine', 'Piperacillin/Tazobactam', 'Vancomycin'], ARRAY['None'], 'Critical', 'ICU Critical'),
('a0000001-0000-4000-8000-000000000019', 'P-019', 'Charles Murphy', 71, 'Male', 'ICU-02',
 ARRAY['ARDS', 'COPD Exacerbation'], ARRAY['Mechanical Ventilation', 'Cisatracurium', 'Methylprednisolone'], ARRAY['Succinylcholine'], 'Critical', 'ICU Critical'),
('a0000001-0000-4000-8000-000000000020', 'P-020', 'Nancy Cooper', 66, 'Female', 'ICU-03',
 ARRAY['STEMI', 'Cardiogenic Shock'], ARRAY['IABP', 'Dobutamine', 'Heparin Infusion'], ARRAY['Contrast Dye'], 'Critical', 'ICU Critical');
