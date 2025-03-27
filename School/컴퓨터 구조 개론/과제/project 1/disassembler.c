#include <stdio.h>
#include <stdint.h>
#include "disassembler.h"

void print_instruction(uint32_t inst) {
    uint32_t opcode = inst & 0x7F;

    if (opcode == 0x33) { // R-type
        uint32_t rd = (inst >> 7) & 0x1F;
        uint32_t funct3 = (inst >> 12) & 0x7;
        uint32_t rs1 = (inst >> 15) & 0x1F;
        uint32_t rs2 = (inst >> 20) & 0x1F;
        uint32_t funct7 = (inst >> 25) & 0x7F;

        if (funct3 == 0x0 && funct7 == 0x00)
            printf("add x%d, x%d, x%d\n", rd, rs1, rs2);
        else if (funct3 == 0x0 && funct7 == 0x20)
            printf("sub x%d, x%d, x%d\n", rd, rs1, rs2);
        else if (funct3 == 0x6 && funct7 == 0x00)
            printf("or x%d, x%d, x%d\n", rd, rs1, rs2);
        else if (funct3 == 0x4 && funct7 == 0x00)
            printf("xor x%d, x%d, x%d\n", rd, rs1, rs2);
        else if (funct3 == 0x1 && funct7 == 0x00)
            printf("sll x%d, x%d, x%d\n", rd, rs1, rs2);
        else
            printf("unknown\n");
    } else {
        printf("unknown\n");
    }
}
