import { asyncHandler } from '../middleware/errorHandler.js';
import * as competencyService from '../services/competency.service.js';
import * as employeeCompetencyService from '../services/employeeCompetency.service.js';

export const listCompetencies = asyncHandler(async (req, res) => {
  const result = await competencyService.listCompetencies(req.user, req.query);
  res.status(200).json({
    success: true,
    message: 'Competencies retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

export const createCompetency = asyncHandler(async (req, res) => {
  const competency = await competencyService.createCompetency(req.user, req.body);
  res.status(201).json({
    success: true,
    message: 'Competency created successfully',
    data: competency,
  });
});

export const getCompetency = asyncHandler(async (req, res) => {
  const competency = await competencyService.getCompetency(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: 'Competency retrieved successfully',
    data: competency,
  });
});

export const updateCompetency = asyncHandler(async (req, res) => {
  const competency = await competencyService.updateCompetency(req.user, req.params.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Competency updated successfully',
    data: competency,
  });
});

export const archiveCompetency = asyncHandler(async (req, res) => {
  const competency = await competencyService.archiveCompetency(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: 'Competency archived successfully',
    data: competency,
  });
});

// Employee self-service
export const getMyCompetencies = asyncHandler(async (req, res) => {
  const competencies = await employeeCompetencyService.getMyCompetencies(req.user);
  res.status(200).json({
    success: true,
    message: 'My competencies retrieved successfully',
    data: competencies,
  });
});

export const getMyCompetencyDetail = asyncHandler(async (req, res) => {
  const detail = await employeeCompetencyService.getMyCompetencyDetail(req.user, req.params.id);
  res.status(200).json({
    success: true,
    message: 'Competency detail retrieved successfully',
    data: detail,
  });
});

