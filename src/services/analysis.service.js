import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

export class AnalysisService {
	async analyzeData(data) {
		try {
			const { resource, userId, answers } = data;

			// Si tenemos respuestas, procedemos con el análisis final
			if (answers) {
				return await this.performFinalAnalysis(resource, answers);
			}

			// Si no hay respuestas, hacemos el análisis inicial
			return await this.performInitialAnalysis(resource);
		} catch (error) {
			throw new Error("Error en el análisis: " + error.message);
		}
	}

	async performInitialAnalysis(imageUrl) {
		const prompt = `Eres un experto en análisis nutricional y reconocimiento de alimentos. Tu tarea es analizar la imagen proporcionada y:

		1. Si necesitas información adicional para calcular las calorías con precisión:
		   - Identifica qué información específica falta
		   - Crea preguntas relevantes basadas en lo que ves en la imagen
		   - Proporciona opciones específicas para cada pregunta
		   - Devuelve un JSON con esta estructura:
		   {
			 "questions": [
			   {
				 "choiceType": "MULTIPLE" | "SINGLE",
				 "question": "Pregunta específica sobre lo que ves en la imagen",
				 "options": ["Opción 1", "Opción 2", "Opción 3"]
			   }
			 ]
		   }

		2. Si puedes determinar las calorías directamente:
		   - Identifica el alimento o plato
		   - Calcula las calorías basándote en los ingredientes visibles
		   - Devuelve un JSON con esta estructura:
		   {
			 "calories": número,
			 "name": "nombre específico del alimento"
		   }

		3. Si la imagen NO es de comida o alimento:
		   - Devuelve exactamente este JSON:
		   {
			 "type": "INVALID_IMAGE",
			 "data": {
				"reason": "NOT_FOOD",
				"errorMessage": "Image is not a valid food image"
			 }
		   }

		IMPORTANTE:
		- Analiza cuidadosamente la imagen antes de responder
		- NO uses las preguntas o nombres de ejemplo
		- Sé específico con las preguntas y opciones basadas en lo que realmente ves
		- Si hay múltiples alimentos, identifica el principal
		- Las calorías deben ser un número, no un string
		- El nombre debe ser específico y descriptivo`;

		const response = await openai.chat.completions.create({
			model: "gpt-4o",
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: prompt },
						{
							type: "image_url",
							image_url: {
								url: imageUrl,
							},
						},
					],
				},
			],
			max_tokens: 1000,
			response_format: { type: "json_object" },
		});

		const result = JSON.parse(response.choices[0].message.content);

		// Si el resultado contiene preguntas, devolvemos el formato DOUBTS
		if (result.questions) {
			return {
				type: "DOUBTS",
				data: result.questions,
			};
		}

		// Si el resultado contiene calorías, devolvemos el formato SUCCESS
		if (result.calories && result.name) {
			return {
				type: "SUCCESS",
				data: {
					calories: result.calories,
					name: result.name,
				},
			};
		}

		// Si no es comida ni dudas, devolvemos el error solicitado
		return {
			type: "INVALID_IMAGE",
			data: {
				reason: "NOT_FOOD",
				errorMessage: "Image is not a valid food image",
			},
		};
	}

	async performFinalAnalysis(imageUrl, answers) {
		const prompt = `Eres un experto en análisis nutricional. Analiza la imagen junto con las respuestas proporcionadas y:

		1. Identifica todos los componentes visibles del alimento
		2. Considera las respuestas proporcionadas para ajustar tu análisis
		3. Calcula las calorías totales basándote en:
		   - Los ingredientes visibles
		   - Las respuestas proporcionadas
		   - El tamaño y porción visible
		4. Proporciona un nombre específico y descriptivo del alimento

		Devuelve un JSON con esta estructura:
		{
		  "calories": número,
		  "name": "nombre específico y descriptivo del alimento"
		}

		IMPORTANTE:
		- Las calorías deben ser un número, no un string
		- El nombre debe ser específico y descriptivo
		- Considera todos los detalles visibles y las respuestas proporcionadas
		- Sé preciso en el cálculo de calorías`;

		const response = await openai.chat.completions.create({
			model: "gpt-4o",
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: prompt },
						{
							type: "image_url",
							image_url: {
								url: imageUrl,
							},
						},
						{
							type: "text",
							text: `Respuestas proporcionadas: ${JSON.stringify(answers)}`,
						},
					],
				},
			],
			max_tokens: 1000,
			response_format: { type: "json_object" },
		});

		const result = JSON.parse(response.choices[0].message.content);

		// Validación adicional para asegurar que tenemos los datos necesarios
		if (!result.calories || !result.name) {
			throw new Error("El modelo no devolvió la estructura esperada");
		}

		return {
			type: "SUCCESS",
			data: {
				calories: result.calories,
				name: result.name,
			},
		};
	}
}

export const analysisService = new AnalysisService();
