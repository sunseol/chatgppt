# Test Spec: DF-041D Dataset Normalizer

## Dataset Normalization Tests

- Given CSV-like rows, when normalized, then a `ResearchDataset` with label/value/year/segment rows is produced.
- Given missing row values, when normalized, then the missing-value policy records omitted labels and handling strategy.
- Given an API/table source with chart metadata, when normalized, then a `ResearchChart` references the normalized dataset id and metadata.
- Given a row with a non-numeric value field, when normalized, then a typed normalization error is thrown.
