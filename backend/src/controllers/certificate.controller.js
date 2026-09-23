import { asyncHandler } from '../middleware/errorHandler.js';
import * as certificateService from '../services/certificate.service.js';

export const listCertificates = asyncHandler(async (req, res) => {
  const result = await certificateService.listCertificates(req.user, req.query);
  res.status(200).json({
    success: true,
    message: 'Certificates retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

export const getCertificate = asyncHandler(async (req, res) => {
  const certificate = await certificateService.getCertificate(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: 'Certificate retrieved successfully',
    data: certificate,
  });
});

export const revokeCertificate = asyncHandler(async (req, res) => {
  const reason = req.body.reason || '';
  const certificate = await certificateService.revokeCertificate(req.user, req.params.id, reason);
  res.status(200).json({
    success: true,
    message: 'Certificate revoked successfully',
    data: certificate,
  });
});

export const listMyCertificates = asyncHandler(async (req, res) => {
  const certificates = await certificateService.listMyCertificates(req.user);
  res.status(200).json({
    success: true,
    message: 'My certificates retrieved successfully',
    data: certificates,
  });
});

/**
 * Public endpoint - no authentication required.
 * Scoped to safe verification payload only.
 */
export const verifyCertificate = asyncHandler(async (req, res) => {
  const verification = await certificateService.verifyPublicCertificate(req.params.verificationCode);
  res.status(200).json({
    success: true,
    message: verification.valid ? 'Certificate is valid' : 'Certificate verification failed',
    data: verification,
  });
});

