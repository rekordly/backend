// KYC Status Enum
const KycStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  NOT_STARTED: 'NOT_STARTED'
};

// Document Types
const DocumentTypes = {
  NATIONAL_ID: 'NATIONAL_ID',
  DRIVERS_LICENSE: 'DRIVERS_LICENSE',
  VEHICLE_REGISTRATION: 'VEHICLE_REGISTRATION',
  PROOF_OF_ADDRESS: 'PROOF_OF_ADDRESS'
};

// KYC Status Transitions
const KycStatusTransitions = {
  [KycStatus.NOT_STARTED]: [KycStatus.PENDING],
  [KycStatus.PENDING]: [KycStatus.VERIFIED, KycStatus.REJECTED],
  [KycStatus.VERIFIED]: [], // Final state
  [KycStatus.REJECTED]: [KycStatus.PENDING] // Can resubmit
};

// Check if KYC status transition is valid
const isValidKycStatusTransition = (currentStatus, newStatus) => {
  const allowedTransitions = KycStatusTransitions[currentStatus] || [];
  return allowedTransitions.includes(newStatus);
};

// Get allowed KYC status transitions
const getAllowedKycStatusTransitions = (currentStatus) => {
  return KycStatusTransitions[currentStatus] || [];
};

// Check if KYC is verified
const isKycVerified = (status) => {
  return status === KycStatus.VERIFIED;
};

// Check if KYC is pending
const isKycPending = (status) => {
  return status === KycStatus.PENDING;
};

// Check if KYC is rejected
const isKycRejected = (status) => {
  return status === KycStatus.REJECTED;
};

// Check if KYC is complete (verified or rejected)
const isKycComplete = (status) => {
  return [KycStatus.VERIFIED, KycStatus.REJECTED].includes(status);
};

// Check if user can submit KYC
const canSubmitKyc = (status) => {
  return [KycStatus.NOT_STARTED, KycStatus.REJECTED].includes(status);
};

// Check if user can update KYC
const canUpdateKyc = (status) => {
  return [KycStatus.PENDING, KycStatus.REJECTED].includes(status);
};

// Check if driver is eligible for orders
const isDriverEligible = (kycStatus) => {
  return kycStatus === KycStatus.VERIFIED;
};

// Get KYC status display name
const getKycStatusDisplayName = (status) => {
  const displayNames = {
    [KycStatus.NOT_STARTED]: 'Not Started',
    [KycStatus.PENDING]: 'Under Review',
    [KycStatus.VERIFIED]: 'Verified',
    [KycStatus.REJECTED]: 'Rejected'
  };
  return displayNames[status] || status;
};

// Get document type display name
const getDocumentTypeDisplayName = (documentType) => {
  const displayNames = {
    [DocumentTypes.NATIONAL_ID]: 'National ID',
    [DocumentTypes.DRIVERS_LICENSE]: 'Driver\'s License',
    [DocumentTypes.VEHICLE_REGISTRATION]: 'Vehicle Registration',
    [DocumentTypes.PROOF_OF_ADDRESS]: 'Proof of Address'
  };
  return displayNames[documentType] || documentType;
};

// Check if all required documents are verified
const areAllDocumentsVerified = (documents) => {
  const requiredDocuments = [
    DocumentTypes.NATIONAL_ID,
    DocumentTypes.DRIVERS_LICENSE,
    DocumentTypes.VEHICLE_REGISTRATION
  ];
  
  return requiredDocuments.every(docType => {
    const document = documents.find(doc => doc.type === docType);
    return document && document.status === KycStatus.VERIFIED;
  });
};

// Check if any document is rejected
const isAnyDocumentRejected = (documents) => {
  return documents.some(doc => doc.status === KycStatus.REJECTED);
};

// Check if all documents are submitted
const areAllDocumentsSubmitted = (documents) => {
  const requiredDocuments = [
    DocumentTypes.NATIONAL_ID,
    DocumentTypes.DRIVERS_LICENSE,
    DocumentTypes.VEHICLE_REGISTRATION
  ];
  
  return requiredDocuments.every(docType => {
    return documents.some(doc => doc.type === docType);
  });
};

module.exports = {
  KycStatus,
  DocumentTypes,
  KycStatusTransitions,
  isValidKycStatusTransition,
  getAllowedKycStatusTransitions,
  isKycVerified,
  isKycPending,
  isKycRejected,
  isKycComplete,
  canSubmitKyc,
  canUpdateKyc,
  isDriverEligible,
  getKycStatusDisplayName,
  getDocumentTypeDisplayName,
  areAllDocumentsVerified,
  isAnyDocumentRejected,
  areAllDocumentsSubmitted
};