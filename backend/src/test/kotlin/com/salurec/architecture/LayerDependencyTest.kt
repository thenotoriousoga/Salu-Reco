package com.salurec.architecture

import com.tngtech.archunit.core.importer.ClassFileImporter
import com.tngtech.archunit.core.importer.ImportOption
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses
import org.junit.jupiter.api.Test

/**
 * オニオンアーキテクチャ × CQRS + JPA分離のレイヤー境界を ArchUnit で検証する。
 */
class LayerDependencyTest {

    private val classes = ClassFileImporter()
        .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
        .importPackages("com.salurec")

    @Test
    fun `domain層はフレームワーク・JPAに依存しない`() {
        noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "org.springframework..",
                "jakarta.persistence..",
                "org.hibernate..",
            )
            .check(classes)
    }

    @Test
    fun `JPA Entity は infrastructure_persistence_entity にしか存在しない`() {
        classes().that().areAnnotatedWith(jakarta.persistence.Entity::class.java)
            .should().resideInAPackage("..infrastructure.persistence.entity..")
            .check(classes)
    }

    @Test
    fun `domain層はapplication・infrastructure・presentationに依存しない`() {
        noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "..application..",
                "..infrastructure..",
                "..presentation..",
            )
            .check(classes)
    }

    @Test
    fun `application層はinfrastructure・presentationに依存しない`() {
        noClasses().that().resideInAPackage("..application..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "..infrastructure..",
                "..presentation..",
            )
            .check(classes)
    }

    @Test
    fun `Command UseCase は Query パッケージに依存しない`() {
        noClasses().that().resideInAPackage("..application.command..")
            .should().dependOnClassesThat().resideInAPackage("..application.query..")
            .check(classes)
    }

    @Test
    fun `Query Service は Command パッケージに依存しない`() {
        noClasses().that().resideInAPackage("..application.query..")
            .should().dependOnClassesThat().resideInAPackage("..application.command..")
            .check(classes)
    }
}
