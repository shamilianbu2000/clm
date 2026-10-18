import { Template } from './models';

const raw = [
  {
    id: 'nda', name: 'Non-Disclosure Agreement', description: 'Mutual NDA between two parties',
    title: 'NDA - {{party}}',
    content: '<h2>Mutual Non-Disclosure Agreement</h2><p>This agreement is made on <strong>{{date}}</strong> between {{company}} and {{party}}.</p><p>Both parties agree to keep confidential information secret for {{term_years}} years from the date above.</p>',
  },
  {
    id: 'service', name: 'Service Agreement', description: 'Services provided for a fee',
    title: 'Service Agreement - {{party}}',
    content: '<h2>Service Agreement</h2><p>Effective {{date}}, {{company}} will provide the following services to {{party}}: {{services}}.</p><ul><li>Fee: {{fee}}</li><li>Payment: Net 30</li></ul>',
  },
  {
    id: 'offer', name: 'Employment Offer', description: 'Offer letter for a new hire',
    title: 'Employment Offer - {{party}}',
    content: '<h2>Employment Offer</h2><p>Dear {{party}},</p><p>{{company}} is pleased to offer you the position of <strong>{{role}}</strong> starting {{date}} at an annual salary of {{salary}}.</p>',
  },
];

export const placeholders = (s: string) => [...new Set([...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))];
export const fill = (s: string, v: Record<string, string>) =>
  s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (v[k] ?? '').replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]!));

export const TEMPLATES: Template[] = raw.map((t) => ({ ...t, fields: placeholders(t.title + t.content) }));
