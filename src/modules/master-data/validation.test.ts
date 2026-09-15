import { describe, expect, it } from "vitest";
import { companySchema, customerSchema } from "./validation";

describe("dados mestres ampliados", () => {
  it("aceita Company com contatos e endereço opcionais", () => {
    const company = companySchema.parse({ name: "Genect", tradeName: "Genect", document: "123", stateRegistration: "IE", phone: "1", whatsapp: "2", email: "CONTATO@EXEMPLO.COM", postalCode: "1", address: "Rua", addressNumber: "10", addressComplement: "A", neighborhood: "Centro", city: "Cidade", state: "ce" });
    expect(company.email).toBe("contato@exemplo.com");
    expect(company.state).toBe("CE");
  });

  it("aceita Customer PF sem CNPJ e PJ com dados empresariais", () => {
    expect(customerSchema.parse({ name: "Pessoa", personType: "PF", tradeName: "", document: "", stateRegistration: "", phone: "", whatsapp: "", email: "", postalCode: "", address: "", addressNumber: "", addressComplement: "", neighborhood: "", city: "", state: "" }).document).toBeNull();
    expect(customerSchema.parse({ name: "Empresa", personType: "PJ", tradeName: "Fantasia", document: "123", stateRegistration: "IE", phone: "", whatsapp: "", email: "", postalCode: "", address: "", addressNumber: "", addressComplement: "", neighborhood: "", city: "", state: "" }).tradeName).toBe("Fantasia");
  });
});
