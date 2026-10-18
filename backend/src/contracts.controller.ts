import { BadRequestException, Body, Controller, Get, Headers, Param, Post, Put } from '@nestjs/common';
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

  @Get() list() { return this.svc.list(); }
  @Get(':id') get(@Param('id') id: string) { return this.svc.get(id); }
  @Get(':id/audit') audit(@Param('id') id: string) { return this.svc.get(id).audit; }

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
