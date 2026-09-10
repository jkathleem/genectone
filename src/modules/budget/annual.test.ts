import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma";
import { calculateOperationalDre } from "@/modules/dre/domain";
import { annualMargin, annualTotals } from "./annual";
import { comparison } from "./domain";

describe("visão anual do orçamento",()=>{
 it("soma os 12 meses e preserva meses vazios",()=>{const months=Array.from({length:12},(_,i)=>calculateOperationalDre(i<2?[i===0?"100000":"120000"]:[],[]));const totals=annualTotals(months);expect(totals.grossRevenue.toFixed(2)).toBe("220000.00");expect(totals.managerialNetIncome.toFixed(2)).toBe("220000.00");});
 it("valida o cenário anual principal",()=>{const month=(revenue:string,fixed:string)=>calculateOperationalDre([revenue],[{classificationCode:"FIXED",classificationName:"Fixas",group:"FIXED_COST_EXPENSE",amount:fixed}]);const empty=()=>calculateOperationalDre([],[]);const planned=annualTotals([month("100000","80000"),month("120000","90000"),...Array.from({length:10},empty)]),actual=annualTotals([month("90000","75000"),month("130000","95000"),...Array.from({length:10},empty)]);expect(planned.grossRevenue.toFixed(2)).toBe("220000.00");expect(actual.grossRevenue.toFixed(2)).toBe("220000.00");expect(planned.managerialNetIncome.toFixed(2)).toBe("50000.00");expect(actual.managerialNetIncome.toFixed(2)).toBe("50000.00");expect(comparison(planned.managerialNetIncome,actual.managerialNetIncome,"REVENUE").variance.isZero()).toBe(true);});
 it("calcula percentuais sobre totais, não pela média mensal",()=>{expect(annualMargin(new Prisma.Decimal("190"),new Prisma.Decimal("1000"))?.toFixed(2)).toBe("19.00");});
 it("calcula variação e favorabilidade anuais pelos totais",()=>{const revenue=comparison("220000","220000","REVENUE"),expense=comparison("50000","55000","EXPENSE");expect(revenue.variance.isZero()).toBe(true);expect(revenue.evaluation).toBe("Neutra");expect(expense.evaluation).toBe("Desfavorável");});
 it("deixa margem anual indefinida sem receita",()=>{const zero=calculateOperationalDre([],[]).grossRevenue;expect(annualMargin(zero,zero)).toBeNull();});
});
