export async function getUsers() {
    const token = localStorage.getItem("token");

    const response = await fetch("http://localhost:5000/users", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await response.json();
    console.log("Respuesta backend:", data);

    if (!response.ok) {
        throw new Error("No autorizado");
    }

    return data;
}