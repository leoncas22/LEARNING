import { asyncHandler } from '../middleware/errorHandler.js';
import * as reportingService from '../services/reporting.service.js';

function csvValue(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.split('"').join('"')}"`;
}

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await reportingService.getDashboard(req.user);
  res.status(200).json({ success: true, message: 'Reporting dashboard retrieved', data });
});

export const getSection = asyncHandler(async (req, res) => {
  const section = req.path.slice(1);
  const data = await reportingService.getSection(req.user, section);
  res.status(200).json({ success: true, message: 'Reporting section retrieved', data });
});

export const getEmployee = asyncHandler(async (req, res) => {
  const data = await reportingService.getEmployee(req.user, req.params.employeeId);
  res.status(200).json({ success: true, message: 'Employee report retrieved', data });
});

export const getTrainings = asyncHandler(async (req, res) => {
  const data = await reportingService.getTrainings(req.user, req.query);
  res.status(200).json({ success: true, message: 'Training report retrieved', data });
});

export const exportReport = asyncHandler(async (req, res) => {
  const rows = await reportingService.getExportRows(req.user, req.params.type);
  const headers = rows.length ? Object.keys(rows[0]) : ['message'];
  const csvRows = rows.length ? [headers, ...rows.map((row) => headers.map((header) => row[header]))] : [headers, ['No data']];
  const csv = csvRows.map((row) => row.map(csvValue).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="lms-${req.params.type}-report.csv"`);
  res.send(csv);
});

export const exportTraining = exportReport;
