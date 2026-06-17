# Test Spec: DF-035 Logo/Image Asset Placement

## Asset Placement Tests

- Given user logo and generated logo candidates, when ranking placements, then the user-provided logo ranks first and keeps `sourceAssetId`.
- Given a sensitive product image and an external provider target, when building a placement suggestion, then the suggestion requires user confirmation.
- Given an image asset for local slide-spec placement, when building a placement suggestion, then the suggestion can be used without external-provider confirmation.
- Given a non-image project asset, when building a visual placement suggestion, then a typed placement error is thrown.
