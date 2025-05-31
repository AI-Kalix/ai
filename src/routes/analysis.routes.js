import express from "express";
import { analysisService } from "../services/analysis.service.js";

export const router = express.Router();

router.post("/analysis", async (req, res) => {
	try {
		const { resource, userId, answers } = req.body;
		console.log("req.body", JSON.stringify(req.body, null, 2));

		// Validación básica
		if (!resource || !userId) {
			return res.status(400).json({
				success: false,
				message: "Se requieren los campos resource y userId",
			});
		}

		// Si hay respuestas, validar su estructura
		if (answers) {
			if (!Array.isArray(answers)) {
				return res.status(400).json({
					success: false,
					message: "El campo answers debe ser un array",
				});
			}

			for (const answer of answers) {
				if (!answer.question || !answer.options || !answer.answer) {
					return res.status(400).json({
						success: false,
						message: "Cada respuesta debe tener question, options y answer",
					});
				}
			}
		}

		const result = await analysisService.analyzeData(req.body);
		console.log("result", JSON.stringify(result, null, 2));
		res.json(result);
	} catch (error) {
		res.status(500).json({
			success: false,
			message: error.message,
		});
	}
});
