// routes/petRoutes.js
const express = require("express");
const PetController = require("../controllers/PetController");
const auth = require("../middleware/auth");
const router = express.Router();

router.get("/getAllPets", PetController.getAllPets);
router.get("/Cat", PetController.getCatPets);
router.get("/Dog", PetController.getDogPets);
router.post("/addPet", auth, PetController.addPet);
router.put("/updatePet/:id", auth, PetController.updatePet);
router.put("/approve/:id", auth, PetController.approveAdoption);
router.put("/deletePet/:id", auth, PetController.deletePet);

module.exports = router;
