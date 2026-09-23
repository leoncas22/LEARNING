import { asyncHandler } from '../middleware/errorHandler.js';
import * as certificationService from '../services/certification.service.js';

export const listCertifications = asyncHandler(async (req, res) => {
  const result = await certificationService.listCertifications(req.user, req.query);
  res.status(200).json({
    success: true,
    message: 'Certifications retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

export const createCertification = asyncHandler(async (req, res) => {
  const certification = await certificationService.createCertification(req.user, req.body);
  res.status(201).json({
    success: true,
    message: 'Certification created successfully',
    data: certification,
  });
});

export const getCertification = asyncHandler(async (req, res) => {
  const certification = await certificationService.getCertification(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: 'Certification retrieved successfully',
    data: certification,
  });
});

export const updateCertification = asyncHandler(async (req, res) => {
  const certification = await certificationService.updateCertification(req.user, req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Certification updated successfully',
    data: certification,
  });
});

export const archiveCertification = asyncHandler(async (req, res) => {
  const certification = await certificationService.archiveCertification(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: 'Certification archived successfully',
    data: certification,
  });
});

export const checkEligibility = asyncHandler(async (req, res) => {
  // If target employee userId is provided in query, use it; otherwise check acting user
  const userId = req.query.userId || req.user.id;
  const result = await certificationService.checkCertificationEligibility(req.params.id, userId);
  res.status(200).json({
    success: true,
    message: 'Eligibility evaluated successfully',
    data: result,
  });
});

