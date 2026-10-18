import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Put, Query } from '@nestjs/common';
import { ContractInput, ContractsService } from './contracts.service';
import { Actor, Role } from './models';

const ROLES: Role[] = ['Drafter', 'Reviewer', 'Legal', 'Signer'];

/** Mock auth: identity comes from x-role / x-user headers (set by the frontend role switcher). */
function actor(role?: string, user?: string): Actor {
  if (!ROLES.includes(role as Role)) throw new BadRequestException(`x-role header must be one of ${ROLES.join(', ')}`);
  return { role: role as Role, name: user ? decodeURIComponent(user) : `${role} User` };
}

@Controller('contracts')
export class ContractsController {
  constructor(private readonly svc: ContractsService) {}

  @Get() list(@Query('q') q?: string, @Query('status') status?: string, @Query('expiringWithin') w?: string) {
    return this.svc.list({ q, status, expiringWithin: w });
  }
  @Get('renewals') renewals(@Query('days') days?: string) { return this.svc.renewals(days); }
  @Get(':id') get(@Param('id') id: string) { return this.svc.get(id); }
  @Get(':id/audit') audit(@Param('id') id: string) { return this.svc.get(id).audit; }

  @Get(':id/comments') comments(@Param('id') id: string) { return this.svc.get(id).comments; }
  @Post(':id/comments') comment(@Param('id') id: string, @Body() b: { text?: string; parentId?: string }, @Headers('x-role') r?: string, @Headers('x-user') u?: string) {
    return this.svc.addComment(id, b, actor(r, u));
  }
  @Get(':id/versions') versions(@Param('id') id: string) { return this.svc.versionList(id); }
  @Get(':id/diff') diff(@Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string) { return this.svc.diff(id, from, to); }
  @Get(':id/versions/:n') version(@Param('id') id: string, @Param('n') n: string) { return this.svc.version(id, n); }

  @Post() create(@Body() b: ContractInput, @Headers('x-role') r?: string, @Headers('x-user') u?: string) {
    return this.svc.create(b, actor(r, u));
  }
  @Put(':id') update(@Param('id') id: string, @Body() b: ContractInput, @Headers('x-role') r?: string, @Headers('x-user') u?: string) {
    return this.svc.update(id, b, actor(r, u));
  }
  @Post(':id/submit') submit(@Param('id') id: string, @Headers('x-role') r?: string, @Headers('x-user') u?: string) {
    return this.svc.submit(id, actor(r, u));
  }
  @Post(':id/approve') approve(@Param('id') id: string, @Body() b: { comment?: string }, @Headers('x-role') r?: string, @Headers('x-user') u?: string) {
    return this.svc.approve(id, actor(r, u), b?.comment);
  }
  @Post(':id/reject') reject(@Param('id') id: string, @Body() b: { comment?: string }, @Headers('x-role') r?: string, @Headers('x-user') u?: string) {
    return this.svc.reject(id, actor(r, u), b?.comment);
  }
  @Post(':id/sign') sign(@Param('id') id: string, @Body() b: { signature?: string }, @Headers('x-role') r?: string, @Headers('x-user') u?: string) {
    return this.svc.sign(id, actor(r, u), b?.signature);
  }
}

@Controller('templates')
export class TemplatesController {
  constructor(private readonly svc: ContractsService) {}

  @Get() list() { return this.svc.templates(); }
  @Get(':id') get(@Param('id') id: string) { return this.svc.template(id); }
  /** Body: { values: { party: 'Acme', ... } } -> filled { title, content } to prefill the editor. */
  @Post(':id/fill') fill(@Param('id') id: string, @Body() b: { values?: Record<string, string> }) {
    return this.svc.fillTemplate(id, b?.values);
  }
}
