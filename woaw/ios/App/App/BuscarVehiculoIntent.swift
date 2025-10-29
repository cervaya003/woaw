import AppIntents
import UIKit

struct BuscarVehiculoIntent: AppIntent {
    static var title: LocalizedStringResource = "Buscar en Woaw"
    static var description = IntentDescription("Abre Woaw en la búsqueda indicada.")

    @Parameter(title: "Término")
    var termino: String

    static var parameterSummary: some ParameterSummary {
        Summary("Buscar \(\.$termino) en Woaw")
    }

    func perform() async throws -> some IntentResult {
        let term = termino.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? ""
        if let url = URL(string: "https://wo-aw.com/search/\(term)") {
            await MainActor.run {
                UIApplication.shared.open(url)
            }
        }
        return .result()
    }
}
