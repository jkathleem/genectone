import { Prisma } from "@/generated/prisma";
export function competenceDate(year:number,month:number){return new Date(`${year}-${String(month).padStart(2,"0")}-01T00:00:00.000Z`)}
export function financialStatus(dueDate:Date,today=new Date()){const due=dueDate.toISOString().slice(0,10),current=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Fortaleza"}).format(today);return due<current?"Vencida":"Em aberto"}
export function paidAmount(){return new Prisma.Decimal(0)}
export function remainingAmount(original:Prisma.Decimal|string){return new Prisma.Decimal(original)}
