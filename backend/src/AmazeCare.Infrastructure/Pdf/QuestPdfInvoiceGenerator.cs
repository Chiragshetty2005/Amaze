using System.Globalization;
using AmazeCare.Application.Common;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace AmazeCare.Infrastructure.Pdf;

public sealed class QuestPdfInvoiceGenerator : IInvoicePdfGenerator
{
    private static readonly Color Primary = Color.FromHex("#0B6B57");
    private static readonly Color Ink = Color.FromHex("#10201C");
    private static readonly Color Muted = Color.FromHex("#5A6C66");
    private static readonly Color Mint = Color.FromHex("#DDEFE7");
    private static readonly Color Paper = Color.FromHex("#F5F8F6");
    private static readonly Color Line = Color.FromHex("#DBE5E0");
    private static readonly Color Coral = Color.FromHex("#D9553F");

    static QuestPdfInvoiceGenerator()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] Generate(InvoicePdfModel invoice)
    {
        return Document.Create(document =>
        {
            document.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(34);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(style => style.FontSize(9).FontColor(Ink));

                page.Content().Column(column =>
                {
                    column.Spacing(14);

                    column.Item().Row(header =>
                    {
                        header.RelativeItem().Column(left =>
                        {
                            left.Item().Text(invoice.ClinicName).FontSize(23).Bold().FontColor(Primary);
                            left.Item().PaddingTop(4).Text(invoice.ClinicAddress).FontSize(8.5f).FontColor(Muted);
                            left.Item().Text($"{invoice.ClinicPhone}  |  {invoice.ClinicEmail}")
                                .FontSize(8.5f).FontColor(Muted);
                            if (!string.IsNullOrWhiteSpace(invoice.Gstin))
                            {
                                left.Item().Text($"GSTIN: {invoice.Gstin}").FontSize(8.5f).FontColor(Muted);
                            }
                        });

                        header.ConstantItem(190).Column(right =>
                        {
                            right.Item().AlignRight().Text("INVOICE").FontSize(20).Bold().FontColor(Ink);
                            right.Item().AlignRight().PaddingTop(4)
                                .Text(invoice.InvoiceNumber).FontSize(11).SemiBold().FontColor(Primary);
                            right.Item().AlignRight().PaddingTop(3)
                                .Text($"Issued {invoice.IssuedAt}").FontSize(8.5f).FontColor(Muted);
                            right.Item().AlignRight().PaddingTop(7)
                                .Background(StatusColor(invoice.Status))
                                .PaddingVertical(4)
                                .PaddingHorizontal(9)
                                .Text(invoice.Status.ToUpperInvariant())
                                .FontSize(8)
                                .Bold()
                                .FontColor(Colors.White);
                        });
                    });

                    column.Item().LineHorizontal(1).LineColor(Line);

                    column.Item().Row(parties =>
                    {
                        parties.RelativeItem().Column(billedTo =>
                        {
                            billedTo.Item().Text("BILLED TO").FontSize(7.5f).Bold().FontColor(Muted);
                            billedTo.Item().PaddingTop(5).Text(invoice.PatientName).FontSize(11).SemiBold();
                            billedTo.Item().Text(invoice.PatientAddress).FontSize(8.5f).FontColor(Muted);
                            billedTo.Item().Text($"{invoice.PatientPhone}  |  {invoice.PatientEmail}")
                                .FontSize(8.5f).FontColor(Muted);
                        });

                        parties.ConstantItem(34);

                        parties.RelativeItem().Column(treatedBy =>
                        {
                            treatedBy.Item().Text("TREATED BY").FontSize(7.5f).Bold().FontColor(Muted);
                            treatedBy.Item().PaddingTop(5).Text(invoice.DoctorName).FontSize(11).SemiBold();
                            treatedBy.Item().Text(invoice.DoctorSpecialization).FontSize(8.5f).FontColor(Muted);
                            treatedBy.Item().Text(invoice.DoctorQualification).FontSize(8.5f).FontColor(Muted);
                        });
                    });

                    column.Item().Background(Paper).Padding(12).Column(summary =>
                    {
                        summary.Item().Text("Amount due").FontSize(8).Bold().FontColor(Muted);
                        summary.Item().PaddingTop(2)
                            .Text(Currency(invoice.TotalAmount))
                            .FontSize(22)
                            .Bold()
                            .FontColor(Primary);
                        summary.Item().Text("Payment is collected at the clinic.")
                            .FontSize(8.5f)
                            .FontColor(Muted);
                    });

                    column.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(5);
                            columns.RelativeColumn(1.6f);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(HeaderCell).Text("DESCRIPTION").FontSize(7.5f).Bold();
                            header.Cell().Element(HeaderCell).AlignRight().Text("AMOUNT").FontSize(7.5f).Bold();
                        });

                        foreach (var item in invoice.Items)
                        {
                            table.Cell().Element(BodyCell).Text(item.Description).FontSize(9);
                            table.Cell().Element(BodyCell).AlignRight().Text(Currency(item.Amount)).FontSize(9);
                        }
                    });

                    column.Item().Row(totals =>
                    {
                        totals.RelativeItem();

                        totals.ConstantItem(230).Column(amounts =>
                        {
                            amounts.Item().Row(row =>
                            {
                                row.RelativeItem().Text("Subtotal").FontColor(Muted);
                                row.ConstantItem(100).AlignRight().Text(Currency(invoice.Subtotal));
                            });
                            amounts.Item().PaddingTop(5).Row(row =>
                            {
                                row.RelativeItem().Text($"Tax ({invoice.TaxRate:P0})").FontColor(Muted);
                                row.ConstantItem(100).AlignRight().Text(Currency(invoice.TaxAmount));
                            });
                            amounts.Item().PaddingTop(8).LineHorizontal(1).LineColor(Line);
                            amounts.Item().PaddingTop(8).Row(row =>
                            {
                                row.RelativeItem().Text("Total").FontSize(11).Bold();
                                row.ConstantItem(100).AlignRight()
                                    .Text(Currency(invoice.TotalAmount))
                                    .FontSize(12)
                                    .Bold()
                                    .FontColor(Primary);
                            });
                        });
                    });

                    column.Item().PaddingTop(12).LineHorizontal(1).LineColor(Line);
                    column.Item().Row(footer =>
                    {
                        footer.RelativeItem().Text("Thank you for choosing AmazeCare.")
                            .FontSize(8.5f)
                            .FontColor(Muted);
                        footer.ConstantItem(230).AlignRight()
                            .Text("This invoice was generated electronically.")
                            .FontSize(8)
                            .FontColor(Muted);
                    });
                });
            });
        }).GeneratePdf();
    }

    private static IContainer HeaderCell(IContainer container) =>
        container
            .Background(Mint)
            .PaddingVertical(7)
            .PaddingHorizontal(8)
            .BorderBottom(1)
            .BorderColor(Line);

    private static IContainer BodyCell(IContainer container) =>
        container
            .PaddingVertical(7)
            .PaddingHorizontal(8)
            .BorderBottom(1)
            .BorderColor(Line);

    private static Color StatusColor(string status) =>
        status.Equals("paid", StringComparison.OrdinalIgnoreCase) ? Primary : Coral;

    private static string Currency(decimal amount) =>
        $"INR {amount.ToString("N2", CultureInfo.InvariantCulture)}";
}
