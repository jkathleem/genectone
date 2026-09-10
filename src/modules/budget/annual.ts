import { DreGroup, Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { calculateOperationalDre, ClassifiedExpense, sumDecimal } from "@/modules/dre/domain";
import { comparison } from "./domain";

export const annualLineKeys = ["grossRevenue","variableExpenses","contributionMargin","fixedExpenses","operatingProfit","financialRevenue","financialExpenses","resultBeforeTaxes","incomeTaxExpenses","managerialNetIncome"] as const;
export type AnnualLineKey = typeof annualLineKeys[number];

function yearRange(year:number){if(!Number.isInteger(year)||year<1900)throw new Error("Informe um ano válido.");return {from:new Date(Date.UTC(year,0,1)),to:new Date(Date.UTC(year+1,0,1))};}
function emptyMonths<T>(){return Array.from({length:12},()=>[] as T[]);}
export function annualTotals<T extends Record<AnnualLineKey, Prisma.Decimal>>(months:T[]){return Object.fromEntries(annualLineKeys.map(key=>[key,sumDecimal(months.map(month=>month[key]))])) as Record<AnnualLineKey,Prisma.Decimal>;}
export function annualMargin(result:Prisma.Decimal,revenue:Prisma.Decimal){return revenue.gt(0)?result.div(revenue).mul(100):null;}

export async function annualBudgetComparison(companyId:string,year:number){
 if(!companyId)throw new Error("Selecione uma empresa.");const {from,to}=yearRange(year);
 const [billings,payables,budgets]=await Promise.all([
  prisma.billing.findMany({where:{companyId,competenceDate:{gte:from,lt:to}},select:{competenceDate:true,amount:true}}),
  prisma.accountPayable.findMany({where:{companyId,competenceDate:{gte:from,lt:to},financialNatureSnapshot:{in:["OPERATING_EXPENSE","DRE_POST_OPERATING"]},dreGroupSnapshot:{not:null}},select:{competenceDate:true,originalAmount:true,classificationCodeSnapshot:true,classificationNameSnapshot:true,dreGroupSnapshot:true}}),
  prisma.budget.findMany({where:{companyId,competenceDate:{gte:from,lt:to}},include:{entries:true},orderBy:{competenceDate:"asc"}}),
 ]);
 const revenues=emptyMonths<Prisma.Decimal>(),actualExpenses=emptyMonths<ClassifiedExpense>(),plannedRevenues=emptyMonths<Prisma.Decimal>(),plannedExpenses=emptyMonths<ClassifiedExpense>();
 billings.forEach(x=>revenues[x.competenceDate.getUTCMonth()].push(x.amount));
 payables.forEach(x=>actualExpenses[x.competenceDate.getUTCMonth()].push({classificationCode:x.classificationCodeSnapshot,classificationName:x.classificationNameSnapshot,group:x.dreGroupSnapshot!,amount:x.originalAmount}));
 budgets.forEach(b=>b.entries.forEach(e=>{const month=b.competenceDate.getUTCMonth();if(e.entryType==="GROSS_REVENUE")plannedRevenues[month].push(e.amount);else plannedExpenses[month].push({classificationCode:e.classificationCodeSnapshot!,classificationName:e.classificationNameSnapshot!,group:e.dreGroupSnapshot!,amount:e.amount});}));
 const planned=plannedRevenues.map((r,i)=>calculateOperationalDre(r,plannedExpenses[i])),actual=revenues.map((r,i)=>calculateOperationalDre(r,actualExpenses[i]));
 const plannedTotals=annualTotals(planned),actualTotals=annualTotals(actual);
 const lines=Object.fromEntries(annualLineKeys.map(key=>{const expense=["variableExpenses","fixedExpenses","financialExpenses","incomeTaxExpenses"].includes(key);return [key,{months:planned.map((p,i)=>comparison(p[key],actual[i][key],expense?"EXPENSE":"REVENUE")),total:comparison(plannedTotals[key],actualTotals[key],expense?"EXPENSE":"REVENUE")}];})) as Record<AnnualLineKey,{months:ReturnType<typeof comparison>[];total:ReturnType<typeof comparison>}>;
 const detailMap=new Map<string,{code:string;name:string;group:DreGroup;planned:Prisma.Decimal;actual:Prisma.Decimal}>();
 const add=(items:ClassifiedExpense[],kind:"planned"|"actual")=>items.forEach(x=>{const current=detailMap.get(x.classificationCode)??{code:x.classificationCode,name:x.classificationName,group:x.group,planned:new Prisma.Decimal(0),actual:new Prisma.Decimal(0)};current[kind]=current[kind].plus(x.amount);if(kind==="planned")current.name=x.classificationName;detailMap.set(x.classificationCode,current);});
 plannedExpenses.flat().forEach(x=>add([x],"planned"));actualExpenses.flat().forEach(x=>add([x],"actual"));
 const details=[...detailMap.values()].map(x=>({...x,...comparison(x.planned,x.actual,x.group==="FINANCIAL_REVENUE"?"REVENUE":"EXPENSE")})).sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
 return {lines,details,budgetMonths:new Set(budgets.map(x=>x.competenceDate.getUTCMonth())),margins:{plannedContribution:annualMargin(plannedTotals.contributionMargin,plannedTotals.grossRevenue),actualContribution:annualMargin(actualTotals.contributionMargin,actualTotals.grossRevenue),plannedOperating:annualMargin(plannedTotals.operatingProfit,plannedTotals.grossRevenue),actualOperating:annualMargin(actualTotals.operatingProfit,actualTotals.grossRevenue),plannedNet:annualMargin(plannedTotals.managerialNetIncome,plannedTotals.grossRevenue),actualNet:annualMargin(actualTotals.managerialNetIncome,actualTotals.grossRevenue)}};
}
